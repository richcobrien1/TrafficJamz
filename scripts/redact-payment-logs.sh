#!/usr/bin/env bash
# Redact sensitive payment data from logs
# Usage: redact-payment-logs.sh [input-file]
# If input-file is omitted, reads from stdin and writes to stdout.

set -eu

usage() {
  cat <<'USAGE' >&2
Usage: redact-payment-logs.sh [input-file]

This script masks payment card data in logs: PANs, Track2 data, CVV, PINData,
KeySerialNumber and AccountNumber XML fields. It keeps harmless context (e.g.
last 4 digits) but replaces other digits with X to preserve privacy.

Example:
  scripts/redact-payment-logs.sh raw.log > redacted.log
  cat raw.log | scripts/redact-payment-logs.sh > redacted.log

Do NOT use this as a substitute for PCI-compliant handling. This is for
log-sanitization only.
USAGE
}

if [[ "${1-}" == "-h" || "${1-}" == "--help" ]]; then
  usage
  exit 0
fi

INPUT="${1-}" 

# Read entire input as one string so multiline XML/track fields are handled
# robustly. Use Perl for flexible, careful masking logic.

if [[ -n "$INPUT" ]]; then
  perl -0777 -pe '
    use utf8;
    # Mask <AccountNumber>...</AccountNumber> keeping first 6 and last 4 if long
    s{<AccountNumber>\s*([0-9]{1,19})\s*</AccountNumber>}{
      my $n=$1; my $len=length($n);
      if($len>10){ my $masked = substr($n,0,6) . ("X" x ($len-10)) . substr($n,-4); "<AccountNumber>$masked</AccountNumber>" }
      else { "<AccountNumber>" . ("X" x $len) . "</AccountNumber>" }
    }geis;

    # Mask general PAN-like sequences (13-19 digits) keeping first 6 and last 4
    s{\b([0-9]{6})([0-9]{3,9})([0-9]{4})\b}{$1 . ("X" x length($2)) . $3}ge;

    # Mask Track2 inside XML or plain text (after = up to ; or end)
    s{(Track2>)([^<]+)(</Track2>)}{
      my $t=$2; $t =~ s{([0-9]{4})([0-9]+)([0-9]{4})}{$1 . ("X" x length($2)) . $3}e; "$1$t$3" }geis;
    s{(=)([0-9]{6,19})(?=[^0-9]|$)}{$1 . (substr($2,0,6) . ("X" x (length($2)-10)) . substr($2,-4))}ge;

    # Mask CVV / CardVerificationValue
    s{<CardVerificationValue>\s*\d+\s*</CardVerificationValue>} {"<CardVerificationValue>***</CardVerificationValue>"}geis;

    # Mask PINData and KeySerialNumber fully
    s{<PINData>.*?<\/PINData>}{"<PINData>***</PINData>"}geis;
    s{<KeySerialNumber>.*?<\/KeySerialNumber>}{"<KeySerialNumber>***</KeySerialNumber>"}geis;

    # Mask common labels that may include PANs (AccountNumber: 16 digits, etc.)
    s{(AccountNumber[:=\"]?\s*)([0-9]{6})([0-9]{3,9})([0-9]{4})}{$1 . $2 . ("X" x length($3)) . $4}ge;

  ' "$INPUT"
else
  perl -0777 -pe '
    use utf8;
    s{<AccountNumber>\s*([0-9]{1,19})\s*</AccountNumber>}{
      my $n=$1; my $len=length($n);
      if($len>10){ my $masked = substr($n,0,6) . ("X" x ($len-10)) . substr($n,-4); "<AccountNumber>$masked</AccountNumber>" }
      else { "<AccountNumber>" . ("X" x $len) . "</AccountNumber>" }
    }geis;
    s{\b([0-9]{6})([0-9]{3,9})([0-9]{4})\b}{$1 . ("X" x length($2)) . $3}ge;
    s{(Track2>)([^<]+)(</Track2>)}{
      my $t=$2; $t =~ s{([0-9]{4})([0-9]+)([0-9]{4})}{$1 . ("X" x length($2)) . $3}e; "$1$t$3" }geis;
    s{(=)([0-9]{6,19})(?=[^0-9]|$)}{$1 . (substr($2,0,6) . ("X" x (length($2)-10)) . substr($2,-4))}ge;
    s{<CardVerificationValue>\s*\d+\s*</CardVerificationValue>} {"<CardVerificationValue>***</CardVerificationValue>"}geis;
    s{<PINData>.*?<\/PINData>}{"<PINData>***</PINData>"}geis;
    s{<KeySerialNumber>.*?<\/KeySerialNumber>}{"<KeySerialNumber>***</KeySerialNumber>"}geis;
    s{(AccountNumber[:=\"]?\s*)([0-9]{6})([0-9]{3,9})([0-9]{4})}{$1 . $2 . ("X" x length($3)) . $4}ge;
  '
fi

exit 0

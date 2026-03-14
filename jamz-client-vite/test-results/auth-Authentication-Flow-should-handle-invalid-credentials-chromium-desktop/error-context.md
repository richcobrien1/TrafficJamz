# Page snapshot

```yaml
- generic [ref=e6]:
  - generic [ref=e7]:
    - generic [ref=e9]:
      - heading "Sign in to TrafficJamz" [level=1] [ref=e10]
      - paragraph [ref=e11]: Welcome back! Please sign in to continue
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e17]:
          - generic [ref=e19]: Email address
          - textbox "Email address" [active] [ref=e20]:
            - /placeholder: Enter your email address
            - text: invalid@email.com
        - generic:
          - generic:
            - generic:
              - generic:
                - generic: Password
              - generic:
                - textbox "Password":
                  - /placeholder: Enter your password
                - button "Show password":
                  - img
      - button "Continue" [ref=e23] [cursor=pointer]:
        - generic [ref=e24]:
          - text: Continue
          - img [ref=e25]
  - generic [ref=e28]:
    - generic [ref=e29]: Don’t have an account?
    - link "Sign up" [ref=e30] [cursor=pointer]:
      - /url: https://jamz.v2u.us/auth/register
```
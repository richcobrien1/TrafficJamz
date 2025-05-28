package com.example.realtimeaudiolocationapp.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.realtimeaudiolocationapp.R;
import com.example.realtimeaudiolocationapp.models.Participant;

import java.util.List;

/**
 * Adapter for displaying participants in the audio communication
 */
public class ParticipantAdapter extends RecyclerView.Adapter<ParticipantAdapter.ParticipantViewHolder> {

    private List<Participant> participants;

    public ParticipantAdapter(List<Participant> participants) {
        this.participants = participants;
    }

    @NonNull
    @Override
    public ParticipantViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_participant, parent, false);
        return new ParticipantViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ParticipantViewHolder holder, int position) {
        Participant participant = participants.get(position);
        holder.bind(participant);
    }

    @Override
    public int getItemCount() {
        return participants.size();
    }

    /**
     * ViewHolder for participant items
     */
    static class ParticipantViewHolder extends RecyclerView.ViewHolder {
        private TextView textName;
        private ImageView imageMicStatus;
        private ImageView imageSpeakerStatus;

        public ParticipantViewHolder(@NonNull View itemView) {
            super(itemView);
            textName = itemView.findViewById(R.id.text_participant_name);
            imageMicStatus = itemView.findViewById(R.id.image_mic_status);
            imageSpeakerStatus = itemView.findViewById(R.id.image_speaker_status);
        }

        public void bind(Participant participant) {
            textName.setText(participant.getName());
            
            // Set microphone status icon
            if (participant.isMicrophoneActive()) {
                imageMicStatus.setImageResource(android.R.drawable.ic_btn_speak_now);
                imageMicStatus.setColorFilter(itemView.getContext().getResources().getColor(R.color.mic_active));
            } else {
                imageMicStatus.setImageResource(android.R.drawable.ic_lock_silent_mode);
                imageMicStatus.setColorFilter(itemView.getContext().getResources().getColor(R.color.mic_muted));
            }
            
            // Set speaker status icon
            if (participant.isSpeakerMuted()) {
                imageSpeakerStatus.setImageResource(android.R.drawable.ic_lock_silent_mode);
                imageSpeakerStatus.setColorFilter(itemView.getContext().getResources().getColor(R.color.speaker_muted));
            } else {
                imageSpeakerStatus.setImageResource(android.R.drawable.ic_lock_silent_mode_off);
                imageSpeakerStatus.setColorFilter(itemView.getContext().getResources().getColor(R.color.speaker_active));
            }
        }
    }
}

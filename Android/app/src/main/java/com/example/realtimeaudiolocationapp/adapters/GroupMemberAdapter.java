package com.example.realtimeaudiolocationapp.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.example.realtimeaudiolocationapp.R;
import com.example.realtimeaudiolocationapp.models.GroupMember;
import com.example.realtimeaudiolocationapp.services.LocationService.ProximityLevel;

import java.util.List;

/**
 * Adapter for displaying group members in the location tracking view
 */
public class GroupMemberAdapter extends RecyclerView.Adapter<GroupMemberAdapter.GroupMemberViewHolder> {

    private List<GroupMember> groupMembers;

    public GroupMemberAdapter(List<GroupMember> groupMembers) {
        this.groupMembers = groupMembers;
    }

    @NonNull
    @Override
    public GroupMemberViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_group_member, parent, false);
        return new GroupMemberViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull GroupMemberViewHolder holder, int position) {
        GroupMember member = groupMembers.get(position);
        holder.bind(member);
    }

    @Override
    public int getItemCount() {
        return groupMembers.size();
    }

    /**
     * ViewHolder for group member items
     */
    static class GroupMemberViewHolder extends RecyclerView.ViewHolder {
        private TextView textName;
        private TextView textDistance;
        private View proximityIndicator;

        public GroupMemberViewHolder(@NonNull View itemView) {
            super(itemView);
            textName = itemView.findViewById(R.id.text_member_name);
            textDistance = itemView.findViewById(R.id.text_member_distance);
            proximityIndicator = itemView.findViewById(R.id.view_proximity_indicator);
        }

        public void bind(GroupMember member) {
            textName.setText(member.getName());
            
            if (member.getLocation() != null) {
                textDistance.setVisibility(View.VISIBLE);
                textDistance.setText(String.format("%.1f m", member.getDistance()));
                
                // Set proximity indicator color based on proximity level
                int colorResId;
                switch (member.getProximityLevel()) {
                    case NEAR:
                        colorResId = R.color.proximity_near;
                        break;
                    case MEDIUM:
                        colorResId = R.color.proximity_medium;
                        break;
                    case FAR:
                        colorResId = R.color.proximity_far;
                        break;
                    default:
                        colorResId = R.color.secondary_text;
                        break;
                }
                proximityIndicator.setBackgroundColor(ContextCompat.getColor(itemView.getContext(), colorResId));
            } else {
                textDistance.setVisibility(View.GONE);
                proximityIndicator.setBackgroundColor(ContextCompat.getColor(itemView.getContext(), R.color.secondary_text));
            }
        }
    }
}

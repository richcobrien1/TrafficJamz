import React, { useState, useEffect } from 'react';
import { Fab, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Tooltip } from '@mui/material';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import api from '../services/api';

// Minimal PlaceControls component. Expects props: groupId, onPlacesChanged (callback)
export default function PlaceControls({ groupId, onPlacesChanged }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', type: 'poi' });

  const openDialog = () => {
    // Try to prefill coords from map center if available on window
    try {
      const map = window.__TJ_MAP__;
      if (map && map.getCenter) {
        const c = map.getCenter();
        setForm(f => ({ ...f, latitude: c.lat.toFixed(6), longitude: c.lng.toFixed(6) }));
      }
    } catch (e) {
      // ignore
    }
    setOpen(true);
  };

  // Listen for global events to open the Add Place dialog with specific coords
  useEffect(() => {
    const handler = (ev) => {
      try {
        const d = ev && ev.detail ? ev.detail : ev;
        if (d && (d.lat || d.latitude) && (d.lng || d.longitude)) {
          const lat = (d.lat || d.latitude).toFixed ? (d.lat || d.latitude).toFixed(6) : String(d.lat || d.latitude);
          const lng = (d.lng || d.longitude).toFixed ? (d.lng || d.longitude).toFixed(6) : String(d.lng || d.longitude);
          setForm(f => ({ ...f, latitude: lat, longitude: lng }));
        }
      } catch (e) {
        // ignore
      }
      setOpen(true);
    };

    window.addEventListener('tj:open-place-dialog', handler);
    return () => window.removeEventListener('tj:open-place-dialog', handler);
  }, []);

  const closeDialog = () => setOpen(false);

  const handleChange = (key) => (ev) => setForm(f => ({ ...f, [key]: ev.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.latitude || !form.longitude) return;
    setSaving(true);
    try {
      await api.post(`/groups/${groupId}/places`, {
        name: form.name,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        type: form.type
      });
      if (typeof onPlacesChanged === 'function') onPlacesChanged();
      // small global event in case parent is not wired
      window.dispatchEvent(new CustomEvent('tj:places:changed'));
      setForm({ name: '', latitude: '', longitude: '', type: 'poi' });
      setOpen(false);
    } catch (e) {
      console.error('Failed to save place', e);
      alert('Failed to save place: ' + (e?.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Tooltip title="Add Place">
        <Fab color="primary" size="medium" onClick={openDialog} sx={{ position: 'absolute', right: 24, bottom: 24, zIndex: 1200 }}>
          <AddLocationIcon />
        </Fab>
      </Tooltip>

      <Dialog open={open} onClose={closeDialog}>
        <DialogTitle>Add Place (Lat / Long)</DialogTitle>
        <DialogContent>
          <TextField label="Name" value={form.name} onChange={handleChange('name')} fullWidth sx={{ mb: 2 }} />
          <TextField label="Latitude" value={form.latitude} onChange={handleChange('latitude')} fullWidth sx={{ mb: 2 }} />
          <TextField label="Longitude" value={form.longitude} onChange={handleChange('longitude')} fullWidth sx={{ mb: 2 }} />
          <TextField select label="Type" value={form.type} onChange={handleChange('type')} fullWidth>
            <MenuItem value="poi">POI</MenuItem>
            <MenuItem value="restaurant">Restaurant</MenuItem>
            <MenuItem value="lift">Lift</MenuItem>
            <MenuItem value="parking">Parking</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

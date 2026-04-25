import * as React from "react";
import * as ReactDOM from "react-dom";
import { Lock, Unlock, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatePresence, motion } from "framer-motion";
import { getBranchDetails, updateBranch, updateBranchRadius } from "@/services/branchService";
import {
  SplashedPushNotifications,
  type SplashedPushNotificationsHandle,
} from "@/components/ui/splashed-push-notifications";
import type { BranchDetailsResponse } from "@/types";

interface LocationSettingsProps {
  /** The branch this admin is managing. Required. */
  branchId: number;
  /**
   * When true, all fields are read-only and the lock toggle is hidden.
   * Pass this when the branch has isLocked === true and the viewer is an ADMIN.
   */
  isLockedForCurrentUser?: boolean;
  /**
   * When true, lat/lng fields are hidden entirely.
   * Use for ADMIN role — their lat/lng comes from getManagedBranch and is
   * only used for map placement, not displayed in Branch Settings.
   */
  hideCoordinates?: boolean;
  onRadiusChange?: (radius: number) => void;
  onSaved?: () => void;
}

export default function LocationSettings({
  branchId,
  isLockedForCurrentUser = false,
  hideCoordinates = false,
  onRadiusChange,
  onSaved,
}: LocationSettingsProps) {
  const toastRef = React.useRef<SplashedPushNotificationsHandle>(null);

  const [original, setOriginal] = React.useState<BranchDetailsResponse | null>(null);
  const [unlocked, setUnlocked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const [radiusRaw, setRadiusRaw]     = React.useState("0");
  const [durationRaw, setDurationRaw] = React.useState("0");
  const [latRaw, setLatRaw]           = React.useState("0");
  const [lngRaw, setLngRaw]           = React.useState("0");
  const [displayName, setDisplayName] = React.useState("");

  const handleSaveRef = React.useRef<() => Promise<void>>(async () => {});

  React.useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const detailRes = await getBranchDetails(branchId);
        const detail = detailRes.data.data;

        setOriginal(detail);
        setDisplayName(detail.displayName ?? "");
        setRadiusRaw(String(detail.radius));
        setDurationRaw(String(detail.autoClockOutDuration ?? 0));

        // Lat/lng from BranchDetailsResponse (present in the GET /branches/{id} response)
        if (!hideCoordinates) {
          setLatRaw(String(detail.latitude ?? 0));
          setLngRaw(String(detail.longitude ?? 0));
        }
      } catch {
        toastRef.current?.createNotification('error', 'Load Failed', 'Failed to load branch settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId, hideCoordinates]);

  const handleRadiusRawChange = (raw: string) => {
    setRadiusRaw(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) onRadiusChange?.(num);
  };

  const handleSave = React.useCallback(async () => {
    const radiusVal   = parseFloat(radiusRaw);
    const durationVal = parseInt(durationRaw, 10);
    const latVal      = parseFloat(latRaw);
    const lngVal      = parseFloat(lngRaw);

    if (isNaN(radiusVal) || radiusVal <= 0) {
      toastRef.current?.createNotification('warning', 'Invalid Radius', 'Radius must be greater than 0.');
      return;
    }

    setSaving(true);
    setShowConfirm(false);

    try {
      const lockedFieldsChanged =
        !hideCoordinates &&
        original !== null &&
        (displayName !== original.displayName ||
          latVal !== (original.latitude ?? 0) ||
          lngVal !== (original.longitude ?? 0));

      if (unlocked && lockedFieldsChanged) {
        await updateBranch(branchId, {
          displayName,
          latitude:  latVal,
          longitude: lngVal,
          radius:    radiusVal,
          autoClockOutDuration: isNaN(durationVal) ? undefined : durationVal,
        });
      } else {
        await updateBranchRadius(branchId, radiusVal);
      }

      setOriginal((prev) => prev ? { ...prev, displayName, radius: radiusVal } : prev);
      setUnlocked(false);

      toastRef.current?.createNotification('success', 'Branch Updated', 'Branch settings saved successfully.');
      onSaved?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update branch settings.';
      toastRef.current?.createNotification('error', 'Save Failed', msg);
    } finally {
      setSaving(false);
    }
  }, [branchId, radiusRaw, durationRaw, latRaw, lngRaw, displayName, unlocked, original, hideCoordinates, onSaved]);

  React.useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  const handleSaveClick = () => {
    const latVal = parseFloat(latRaw);
    const lngVal = parseFloat(lngRaw);
    const lockedFieldsChanged =
      !hideCoordinates &&
      original !== null &&
      (displayName !== original.displayName ||
        latVal !== (original.latitude ?? 0) ||
        lngVal !== (original.longitude ?? 0));

    if (unlocked && lockedFieldsChanged) {
      setShowConfirm(true);
    } else {
      handleSave();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const allReadOnly = isLockedForCurrentUser;
  // Super Admin can unlock name+coords; Admin never sees the coords unlock section
  const showLockedSection = !hideCoordinates;

  return (
    <div className="w-full">
      <SplashedPushNotifications ref={toastRef} />

      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">
          Branch Settings{original ? ` — ${original.displayName}` : ""}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {allReadOnly
            ? "This branch is locked by Super Admin. Settings are read-only."
            : "Manage this branch's perimeter and auto clock-out rules."}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4 sm:space-y-5">

        {/* ── LOCKED SECTION (Super Admin only — name + lat/lng) ──────────── */}
        {showLockedSection && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            {!allReadOnly && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="unlock"
                  checked={unlocked}
                  onCheckedChange={(v) => setUnlocked(v === true)}
                />
                <Label htmlFor="unlock" className="flex items-center gap-2 cursor-pointer text-sm leading-snug">
                  {unlocked
                    ? <Unlock className="h-4 w-4 text-primary shrink-0" />
                    : <Lock   className="h-4 w-4 text-muted-foreground shrink-0" />}
                  {unlocked
                    ? "Locked fields are editable — saving will require confirmation"
                    : "Unlock display name, latitude & longitude"}
                </Label>
              </div>
            )}

            {allReadOnly && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Locked by Super Admin — contact your administrator to make changes.
              </div>
            )}

            {/* Display Name */}
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="flex items-center gap-1.5 text-sm">
                Display Name
                {(!unlocked || allReadOnly) && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!unlocked || allReadOnly}
                className={!unlocked || allReadOnly ? "opacity-60 cursor-not-allowed" : ""}
              />
            </div>

            {/* Lat / Lng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="latitude" className="flex items-center gap-1.5 text-sm">
                  Latitude
                  {(!unlocked || allReadOnly) && <Lock className="h-3 w-3 text-muted-foreground" />}
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latRaw}
                  onChange={(e) => setLatRaw(e.target.value)}
                  disabled={!unlocked || allReadOnly}
                  className={!unlocked || allReadOnly ? "opacity-60 cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="longitude" className="flex items-center gap-1.5 text-sm">
                  Longitude
                  {(!unlocked || allReadOnly) && <Lock className="h-3 w-3 text-muted-foreground" />}
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={lngRaw}
                  onChange={(e) => setLngRaw(e.target.value)}
                  disabled={!unlocked || allReadOnly}
                  className={!unlocked || allReadOnly ? "opacity-60 cursor-not-allowed" : ""}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── FREE FIELDS ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="radius" className="text-sm">
            Radius (meters)
            {!allReadOnly && (
              <span className="ml-2 text-xs text-muted-foreground">— live map preview</span>
            )}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="radius"
              type="number"
              min={10}
              value={radiusRaw}
              onChange={(e) => handleRadiusRawChange(e.target.value)}
              disabled={allReadOnly}
              className={`flex-1 ${allReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
            />
            <span className="text-sm text-muted-foreground w-16 text-right shrink-0">
              {isNaN(parseFloat(radiusRaw)) ? "—" : `${parseFloat(radiusRaw)}m`}
            </span>
          </div>
          {!allReadOnly && (
            <input
              type="range"
              min={50}
              max={2000}
              step={10}
              value={isNaN(parseFloat(radiusRaw)) ? 50 : parseFloat(radiusRaw)}
              onChange={(e) => handleRadiusRawChange(e.target.value)}
              className="w-full accent-primary"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="autoClockOutDuration" className="text-sm">
            Auto clock-out delay{" "}
            <span className="text-muted-foreground font-normal">(minutes after leaving zone)</span>
          </Label>
          <Input
            id="autoClockOutDuration"
            type="number"
            min={1}
            value={durationRaw}
            onChange={(e) => setDurationRaw(e.target.value)}
            disabled={allReadOnly}
            className={allReadOnly ? "opacity-60 cursor-not-allowed" : ""}
          />
        </div>

        {!allReadOnly && (
          <Button className="w-full" onClick={handleSaveClick} disabled={saving}>
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              : "Save changes"}
          </Button>
        )}
      </div>

      {/* Confirmation dialog portal */}
      <AnimatePresence>
        {showConfirm && ReactDOM.createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            style={{ zIndex: 99999 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-card rounded-xl border border-border shadow-xl p-5 sm:p-6 w-full max-w-sm"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Confirm branch location change</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You are updating the branch name or coordinates. This will affect
                    clock-in/out zone detection for <strong>all users</strong> at this branch. Continue?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleSaveRef.current()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, update"}
                </Button>
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
      </AnimatePresence>
    </div>
  );
}

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ChevronDown, Check, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { createUser } from '../services/userService';
import type { BranchResponse, UserRole } from '../types';

interface CreateAdminModalProps {
  open: boolean;
  branches: BranchResponse[];
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateAdminModal({
  open,
  branches,
  onClose,
  onCreated,
}: CreateAdminModalProps) {
  const [email, setEmail] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [selectedBranchId, setSelectedBranchId] = React.useState<number | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<UserRole>('ADMIN');
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const roleDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setSelectedBranchId(null);
      setSelectedRole('ADMIN');
      setError(null);
      setDropdownOpen(false);
      setRoleDropdownOpen(false);
    }
  }, [open]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const requiresPhone = selectedRole === 'ADMIN' || selectedRole === 'SUPER_ADMIN';
  const requiresBranch = selectedRole !== 'SUPER_ADMIN';

  const handleSubmit = async () => {
    if (!email.trim() || !firstName.trim() || !lastName.trim()) return;
    if (requiresBranch && selectedBranchId === null) return;
    if (requiresPhone && !phone.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createUser({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(requiresBranch && selectedBranchId !== null ? { managedBranchId: selectedBranchId } : {}),
        userRole: selectedRole,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      onCreated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create user. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    email.trim().length > 0 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    (!requiresBranch || selectedBranchId !== null) &&
    (!requiresPhone || phone.trim().length > 0);

  const roles: { value: UserRole; label: string }[] = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'USER', label: 'User' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
  ];

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 z-[60]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="bg-card rounded-xl border border-border shadow-xl p-5 sm:p-6 w-full max-w-md relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Create User</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-4 -mt-2">
              A temporary password will be auto-generated. The user will be prompted to change it on first login.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-firstname" className="text-sm">First Name</Label>
                  <Input
                    id="admin-firstname"
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-lastname" className="text-sm">Last Name</Label>
                  <Input
                    id="admin-lastname"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-sm">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="user@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Phone — required for ADMIN / SUPER_ADMIN */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-phone" className="text-sm">
                  Phone
                  {requiresPhone
                    ? <span className="text-destructive ml-0.5">*</span>
                    : <span className="text-muted-foreground font-normal"> (optional)</span>}
                </Label>
                <Input
                  id="admin-phone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {requiresPhone && (
                  <p className="text-[11px] text-muted-foreground">Required for Admin and Super Admin roles.</p>
                )}
              </div>

              {/* Role selector */}
              <div className="space-y-1.5">
                <Label className="text-sm">Role</Label>
                <div className="relative" ref={roleDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setRoleDropdownOpen((v) => !v)}
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  >
                    <span>{roles.find((r) => r.value === selectedRole)?.label}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {roleDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-[70] w-full mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden"
                      >
                        {roles.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => { setSelectedRole(r.value); setRoleDropdownOpen(false); }}
                            className="relative flex w-full cursor-pointer items-center px-3 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <span className="flex-1 text-left">{r.label}</span>
                            {selectedRole === r.value && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Branch selector — not required for SUPER_ADMIN */}
              {requiresBranch && (
              <div className="space-y-1.5">
                <Label className="text-sm">Assign Branch</Label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  >
                    <span className={selectedBranch ? 'text-foreground' : 'text-muted-foreground'}>
                      {selectedBranch ? selectedBranch.displayName : 'Select a branch'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-[70] w-full mt-1 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-auto"
                      >
                        {branches.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">No branches available</div>
                        ) : (
                          <>
                            <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Branches</div>
                            {branches.map((branch) => (
                              <button
                                key={branch.id}
                                type="button"
                                onClick={() => { setSelectedBranchId(branch.id); setDropdownOpen(false); }}
                                className="relative flex w-full cursor-pointer items-center px-3 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                              >
                                <span className="flex-1 text-left">{branch.displayName}</span>
                                {selectedBranchId === branch.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                              </button>
                            ))}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit || saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                ) : 'Create User'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

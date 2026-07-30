import { useState, type FormEvent } from "react";
import {
  Check,
  Glasses,
  Github,
  LoaderCircle,
  Save,
  Scissors,
  Shirt,
  Shuffle,
  Smile,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import {
  AVATAR_ACCESSORIES,
  AVATAR_CLOTHES_COLORS,
  AVATAR_CLOTHING,
  AVATAR_EYES,
  AVATAR_EYEBROWS,
  AVATAR_FACIAL_HAIR,
  AVATAR_HAIR_COLORS,
  AVATAR_HAT_COLORS,
  AVATAR_MOUTHS,
  AVATAR_SKIN_COLORS,
  AVATAR_TOPS,
  defaultAvatarConfig,
  sanitizeAvatarConfig,
} from "@/lib/avatar";
import { useClassroom } from "@/state/classroom-context";
import type { AvatarConfig, Profile } from "@/types";

type EditorTab = "hair" | "face" | "accessories" | "clothing";

function AvatarOptionGrid({
  label,
  property,
  options,
  value,
  profile,
  config,
  onChange,
}: {
  label: string;
  property: keyof AvatarConfig;
  options: readonly (readonly [string, string])[];
  value: string;
  profile: Profile;
  config: AvatarConfig;
  onChange: (property: keyof AvatarConfig, value: string) => void;
}) {
  return (
    <fieldset className="avatar-option-group">
      <legend>{label}</legend>
      <div className="avatar-option-grid">
        {options.map(([optionValue, optionLabel]) => (
          <button
            className={value === optionValue ? "is-selected" : ""}
            type="button"
            aria-pressed={value === optionValue}
            key={optionValue}
            onClick={() => onChange(property, optionValue)}
          >
            <ProfileAvatar
              profile={profile}
              config={{ ...config, [property]: optionValue }}
              size="small"
              decorative
            />
            <span>{optionLabel}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ColorSwatches({
  label,
  property,
  colors,
  value,
  onChange,
}: {
  label: string;
  property: keyof AvatarConfig;
  colors: readonly string[];
  value: string;
  onChange: (property: keyof AvatarConfig, value: string) => void;
}) {
  return (
    <fieldset className="avatar-color-group">
      <legend>{label}</legend>
      <div className="avatar-swatches">
        {colors.map((color) => (
          <button
            className={value === color ? "is-selected" : ""}
            type="button"
            aria-label={`${label}: #${color}`}
            aria-pressed={value === color}
            key={color}
            style={{ "--swatch": `#${color}` } as React.CSSProperties}
            onClick={() => onChange(property, color)}
          >
            <span />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Component() {
  const {
    profile,
    isStudentPreview,
    updateProfile,
  } = useClassroom();
  const [tab, setTab] = useState<EditorTab>("hair");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [config, setConfig] = useState<AvatarConfig>(() =>
    sanitizeAvatarConfig(profile?.avatarConfig, profile?.id ?? "tomatin"),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!profile) return null;
  if (isStudentPreview) return <Navigate to="/" replace />;

  function changeConfig(property: keyof AvatarConfig, value: string) {
    setConfig((current) => ({ ...current, [property]: value }));
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await updateProfile({ displayName, avatarConfig: config });
      setMessage("Perfil actualizado.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar el perfil.",
      );
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    ["hair", "Pelo y gorros", Scissors],
    ["face", "Rostro", Smile],
    ["accessories", "Accesorios", Glasses],
    ["clothing", "Ropa", Shirt],
  ] as const;

  return (
    <main className="page profile-page">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">IDENTIDAD EN EL AULA</p>
          <h1>Tu perfil</h1>
          <p>El nombre visible y el avatar aparecerán en el ranking del curso.</p>
        </div>
      </header>

      <form className="profile-editor" onSubmit={submit}>
        <aside className="profile-preview">
          <ProfileAvatar
            profile={{ ...profile, displayName }}
            config={config}
            size="preview"
          />
          <strong>{displayName.trim() || profile.displayName}</strong>
          <span>
            <Github aria-hidden="true" />
            @{profile.githubLogin ?? "cuenta conectada"}
          </span>
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              setConfig(
                defaultAvatarConfig(`${profile.id}-${crypto.randomUUID()}`),
              )
            }
          >
            <Shuffle aria-hidden="true" />
            Crear otro
          </button>
        </aside>

        <div className="profile-controls">
          <label className="field profile-name-field">
            <span>Nombre visible</span>
            <input
              maxLength={80}
              minLength={1}
              required
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setMessage("");
              }}
            />
            <small>
              Tu usuario de GitHub no cambia; este es el nombre que verá el curso.
            </small>
          </label>

          <div className="avatar-editor-tabs" role="tablist" aria-label="Partes del avatar">
            {tabs.map(([value, label, Icon]) => (
              <button
                type="button"
                role="tab"
                aria-selected={tab === value}
                className={tab === value ? "is-active" : ""}
                key={value}
                onClick={() => setTab(value)}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div className="avatar-editor-panel">
            {tab === "hair" ? (
              <>
                <AvatarOptionGrid
                  label="Pelo o gorro"
                  property="top"
                  options={AVATAR_TOPS}
                  value={config.top}
                  profile={profile}
                  config={config}
                  onChange={changeConfig}
                />
                <div className="avatar-color-row">
                  <ColorSwatches
                    label="Color de pelo"
                    property="hairColor"
                    colors={AVATAR_HAIR_COLORS}
                    value={config.hairColor}
                    onChange={changeConfig}
                  />
                  <ColorSwatches
                    label="Color de gorro"
                    property="hatColor"
                    colors={AVATAR_HAT_COLORS}
                    value={config.hatColor}
                    onChange={changeConfig}
                  />
                </div>
              </>
            ) : null}

            {tab === "face" ? (
              <>
                <ColorSwatches
                  label="Tono de piel"
                  property="skinColor"
                  colors={AVATAR_SKIN_COLORS}
                  value={config.skinColor}
                  onChange={changeConfig}
                />
                <AvatarOptionGrid
                  label="Ojos"
                  property="eyes"
                  options={AVATAR_EYES}
                  value={config.eyes}
                  profile={profile}
                  config={config}
                  onChange={changeConfig}
                />
                <AvatarOptionGrid
                  label="Cejas"
                  property="eyebrows"
                  options={AVATAR_EYEBROWS}
                  value={config.eyebrows}
                  profile={profile}
                  config={config}
                  onChange={changeConfig}
                />
                <AvatarOptionGrid
                  label="Boca"
                  property="mouth"
                  options={AVATAR_MOUTHS}
                  value={config.mouth}
                  profile={profile}
                  config={config}
                  onChange={changeConfig}
                />
              </>
            ) : null}

            {tab === "accessories" ? (
              <>
                <AvatarOptionGrid
                  label="Lentes"
                  property="accessories"
                  options={AVATAR_ACCESSORIES}
                  value={config.accessories}
                  profile={profile}
                  config={config}
                  onChange={changeConfig}
                />
                <AvatarOptionGrid
                  label="Vello facial"
                  property="facialHair"
                  options={AVATAR_FACIAL_HAIR}
                  value={config.facialHair}
                  profile={profile}
                  config={config}
                  onChange={changeConfig}
                />
                <AvatarOptionGrid
                  label="Aros"
                  property="earrings"
                  options={[
                    ["none", "Sin aros"],
                    ["stud", "Punto"],
                    ["hoop", "Argolla"],
                  ]}
                  value={config.earrings}
                  profile={profile}
                  config={config}
                  onChange={changeConfig}
                />
              </>
            ) : null}

            {tab === "clothing" ? (
              <>
                <AvatarOptionGrid
                  label="Ropa"
                  property="clothing"
                  options={AVATAR_CLOTHING}
                  value={config.clothing}
                  profile={profile}
                  config={config}
                  onChange={changeConfig}
                />
                <ColorSwatches
                  label="Color de ropa"
                  property="clothesColor"
                  colors={AVATAR_CLOTHES_COLORS}
                  value={config.clothesColor}
                  onChange={changeConfig}
                />
              </>
            ) : null}
          </div>

          <footer className="profile-editor-actions">
            <a
              href="https://www.dicebear.com/styles/avataaars/"
              target="_blank"
              rel="noreferrer"
            >
              Avatar local basado en DiceBear Avataaars
            </a>
            <span className="editor-message" role="status">
              {message ? (
                <>
                  {message === "Perfil actualizado." ? <Check aria-hidden="true" /> : null}
                  {message}
                </>
              ) : null}
            </span>
            <button className="button primary" type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              Guardar perfil
            </button>
          </footer>
        </div>
      </form>
    </main>
  );
}

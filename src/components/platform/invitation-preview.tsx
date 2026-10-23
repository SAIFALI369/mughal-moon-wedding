import { useEffect, useState, type ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { PersonalInvitation } from "@/components/wedding/invitation-template";

export type PreviewDevice = "phone" | "desktop";

const PHONE_BREAKPOINT = 768;

function isPhoneScreen(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.innerWidth === "number" && window.innerWidth > 0) {
    return window.innerWidth < PHONE_BREAKPOINT;
  }
  return window.matchMedia?.(`(max-width: ${PHONE_BREAKPOINT - 1}px)`)?.matches ?? false;
}

export function usePhoneScreen(): boolean {
  const [isPhone, setIsPhone] = useState<boolean>(isPhoneScreen);

  useEffect(() => {
    const update = () => setIsPhone(isPhoneScreen());
    update();
    const mql = window.matchMedia?.(`(max-width: ${PHONE_BREAKPOINT - 1}px)`);
    mql?.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    return () => {
      mql?.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isPhone;
}

export function PreviewDeviceToggle({
  device,
  onChange,
}: {
  device: PreviewDevice;
  onChange: (next: PreviewDevice) => void;
}) {
  return (
    <div className="preview-device-switch" role="group" aria-label="Preview device">
      <button
        type="button"
        aria-pressed={device === "phone"}
        className={device === "phone" ? "is-active" : ""}
        onClick={() => onChange("phone")}
      >
        <Smartphone size={14} aria-hidden="true" />
        <span>Phone</span>
      </button>
      <button
        type="button"
        aria-pressed={device === "desktop"}
        className={device === "desktop" ? "is-active" : ""}
        onClick={() => onChange("desktop")}
      >
        <Monitor size={14} aria-hidden="true" />
        <span>Desktop</span>
      </button>
    </div>
  );
}

export function InvitationPreview({
  title,
  content,
  cardId,
  defaultDevice = "phone",
  header,
  inline = false,
}: {
  title: string;
  content: unknown;
  cardId?: string;
  defaultDevice?: PreviewDevice;
  header?: ReactNode;
  inline?: boolean;
}) {
  const isPhone = usePhoneScreen();
  const [device, setDevice] = useState<PreviewDevice>(defaultDevice);
  const effectiveDevice: PreviewDevice = isPhone ? "phone" : device;

  return (
    <div className={`admin-preview-shell ${inline ? "is-inline" : "is-modal"}`}>
      {(!isPhone || header) && (
        <div className="admin-preview-toolbar">
          <div className="admin-preview-title">{header}</div>
          {!isPhone && <PreviewDeviceToggle device={effectiveDevice} onChange={setDevice} />}
        </div>
      )}
      <div
        className={`admin-preview-canvas ${
          isPhone
            ? "is-native-phone"
            : effectiveDevice === "phone"
              ? "is-phone-frame"
              : "is-desktop-frame"
        }`}
        data-preview-device={effectiveDevice}
      >
        {!isPhone && effectiveDevice === "phone" ? (
          <div className="preview-phone-bezel">
            <div className="preview-phone-notch" aria-hidden="true">
              <span />
            </div>
            <div className="preview-phone-viewport">
              <PersonalInvitation
                title={title}
                content={content}
                showGate={false}
                preview
                cardId={cardId}
              />
            </div>
          </div>
        ) : (
          <div
            className={isPhone ? "preview-phone-viewport is-native" : "preview-desktop-viewport"}
          >
            <PersonalInvitation
              title={title}
              content={content}
              showGate={false}
              preview
              cardId={cardId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

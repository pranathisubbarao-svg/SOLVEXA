import { useEffect, useRef, useState } from "react";
import axios from "axios";

const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

// Loads Google Identity Services once and reuses it
let scriptPromise = null;

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Could not load Google sign-in"));
      };
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/**
 * "Continue with Google" button.
 * Calls onCredential(credential) with the Google ID token after sign-in.
 */
function GoogleAuthButton({ onCredential, text = "continue_with", disabled }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [status, setStatus] = useState("loading");

  // Always call the latest callback
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const { data } = await axios.get(
          "http://localhost:5000/api/auth/google-config"
        );

        if (!data.clientId) {
          if (!cancelled) setStatus("unconfigured");
          return;
        }

        await loadGoogleScript();

        if (cancelled || !containerRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: data.clientId,
          callback: (response) => callbackRef.current(response.credential),
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          logo_alignment: "center",
          width: containerRef.current.offsetWidth || 320,
        });

        setStatus("ready");
      } catch (error) {
        console.error("Google sign-in setup error:", error);
        if (!cancelled) setStatus("error");
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [text]);

  const label =
    text === "signup_with" ? "Sign up with Google" : "Continue with Google";

  return (
    <div className={`google-auth ${disabled ? "is-disabled" : ""}`}>
      {/* Google renders its official button here */}
      <div
        ref={containerRef}
        className="google-auth-slot"
        style={{ display: status === "ready" ? "flex" : "none" }}
      />

      {status !== "ready" && (
        <button
          type="button"
          className="google-auth-fallback"
          disabled={status === "loading"}
          onClick={() =>
            alert(
              status === "unconfigured"
                ? "Google sign-in isn't set up yet. Add GOOGLE_CLIENT_ID to server/.env and restart the server."
                : "Couldn't reach Google. Check your internet connection and try again."
            )
          }
        >
          <GoogleIcon />
          {status === "loading" ? "Loading Google…" : label}
        </button>
      )}
    </div>
  );
}

export default GoogleAuthButton;

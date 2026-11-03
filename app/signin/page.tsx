"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "sending" | "sent" | "error";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setState("sending");
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setState("error");
      return;
    }
    setState("sent");
  }

  return (
    <div className="app">
      <main className="feed">
        <section className="card c-intro">
          <div className="glow" />
          <div className="content">
            <div className="meta">
              <span className="kind">Sign in</span>
            </div>

            {state === "sent" ? (
              <div className="body">
                <p className="eyebrow">Check your email</p>
                <h2 className="big">Link sent.</h2>
                <p className="lead">
                  We sent a sign-in link to <b>{email}</b>. Open it on this
                  device and you&apos;ll land back here, signed in.
                </p>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setState("idle");
                    setEmail("");
                  }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form className="body" onSubmit={send}>
                <p className="eyebrow">Scrollwise</p>
                <h2 className="big">Keep your streak on every device.</h2>
                <p className="lead">
                  Sign in with your email and your XP, streak, and saved cards
                  follow you everywhere. No password to remember.
                </p>

                <input
                  className="opt"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-label="Email address"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", maxWidth: "34ch" }}
                />

                <button className="btn" type="submit" disabled={state === "sending"}>
                  {state === "sending" ? "Sending…" : "Email me a link"}
                </button>

                {state === "error" && (
                  <p className="why" role="alert">
                    {error}
                  </p>
                )}

                <p className="aside">
                  Your progress on this device is kept and merged in when you
                  sign in.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

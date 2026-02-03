"use client";

import { useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("sent");
        setForm({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          className="w-full border rounded px-3 py-2"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          rows={5}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          required
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-2xl bg-white text-brand-primary-700 px-4 py-3 text-sm font-semibold shadow-lg transition hover:opacity-90 disabled:opacity-60"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>
      {status === "sent" && <p className="text-green-600">Message sent! We'll get back to you soon.</p>}
      {status === "error" && <p className="text-red-600">There was an error sending your message. Please try again.</p>}
    </form>
  );
}

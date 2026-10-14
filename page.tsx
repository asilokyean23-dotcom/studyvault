"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Archive, ArrowDownToLine, File, FileImage, FileText, FileVideo, FolderOpen,
  HardDrive, LogOut, Moon, Search, ShieldCheck, Sun, UploadCloud, X, Trash2,
  Menu, CheckCircle2, AlertCircle, LockKeyhole
} from "lucide-react";

type StoredFile = {
  name: string;
  id?: string;
  metadata?: { size?: number; mimetype?: string; lastModified?: string };
  created_at?: string;
  updated_at?: string;
};

const BUCKET = "school-files";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "")) return <FileImage size={20} />;
  if (["mp4", "mov", "webm"].includes(ext || "")) return <FileVideo size={20} />;
  if (["pdf", "doc", "docx", "txt", "ppt", "pptx"].includes(ext || "")) return <FileText size={20} />;
  return <File size={20} />;
}
function prettyDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [search, setSearch] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [dark, setDark] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("studyvault-theme");
    setDark(saved === "dark");
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setChecking(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("studyvault-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (session?.user) loadFiles();
    else setFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const filteredFiles = useMemo(() => files.filter(f => f.name.toLowerCase().includes(search.toLowerCase())), [files, search]);
  const totalBytes = files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);

  function showNotice(kind: "success" | "error" | "info", text: string) {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 5000);
  }

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        if (!data.session) showNotice("success", "Account created! Check your email to confirm your account, then log in.");
        else showNotice("success", "Your account is ready.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showNotice("success", "Welcome back!");
      }
    } catch (err: any) {
      showNotice("error", err.message || "Could not sign in. Please try again.");
    } finally { setBusy(false); }
  }

  async function loadFiles() {
    if (!session?.user) return;
    setLoadingFiles(true);
    const { data, error } = await supabase.storage.from(BUCKET).list(session.user.id, {
      limit: 100, sortBy: { column: "created_at", order: "desc" }
    });
    if (error) showNotice("error", error.message);
    else setFiles((data || []).filter(f => f.name !== ".emptyFolderPlaceholder"));
    setLoadingFiles(false);
  }

  async function uploadFiles(fileList: FileList | File[]) {
    if (!session?.user || !fileList.length) return;
    setBusy(true);
    let succeeded = 0;
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_FILE_SIZE) {
          showNotice("error", `${file.name} is larger than 50 MB. Please choose a smaller file.`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.\- ()]/g, "_");
        const path = `${session.user.id}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream"
        });
        if (error) throw error;
        succeeded++;
      }
      if (succeeded) showNotice("success", `${succeeded} file${succeeded > 1 ? "s" : ""} uploaded successfully.`);
      await loadFiles();
    } catch (err: any) {
      showNotice("error", err.message || "Upload failed. Please try again.");
    } finally { setBusy(false); }
  }

  async function downloadFile(file: StoredFile) {
    if (!session?.user) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(`${session.user.id}/${file.name}`, 60);
    if (error || !data?.signedUrl) return showNotice("error", error?.message || "Could not create download link.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteFile(file: StoredFile) {
    if (!session?.user || !window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([`${session.user.id}/${file.name}`]);
    if (error) showNotice("error", error.message);
    else {
      setFiles(old => old.filter(f => f.name !== file.name));
      showNotice("success", "File deleted.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setFiles([]);
  }

  if (checking) return <main className="loading-screen"><div className="brand-mark"><Archive size={24} /></div><p>Opening your vault…</p></main>;

  if (!session) return (
    <main className="auth-layout">
      <section className="auth-art">
        <div className="brand"><div className="brand-mark"><Archive size={23} /></div><span>StudyVault</span></div>
        <div className="art-content">
          <div className="eyebrow"><ShieldCheck size={15} /> YOUR SCHOOL FILES, ANYWHERE</div>
          <h1>Everything you need for school. <span>All in one safe place.</span></h1>
          <p>Save your unfinished activities, open them on another device, and keep your schoolwork organized without a USB drive.</p>
          <div className="feature-list">
            <div><div className="feature-icon"><LockKeyhole size={18} /></div><span><b>Private by default</b><small>Your files are tied to your own account.</small></span></div>
            <div><div className="feature-icon"><HardDrive size={18} /></div><span><b>Access anywhere</b><small>Use your laptop, tablet, or phone.</small></span></div>
            <div><div className="feature-icon"><Moon size={18} /></div><span><b>Made for your workflow</b><small>Clean layout with light and dark themes.</small></span></div>
          </div>
        </div>
        <div className="art-footer">A calmer place for your schoolwork.</div>
      </section>
      <section className="auth-side">
        <button className="theme-toggle auth-theme" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        <div className="auth-card">
          <div className="mobile-brand brand"><div className="brand-mark"><Archive size={23} /></div><span>StudyVault</span></div>
          <div className="auth-heading"><div className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</div><h2>{mode === "login" ? "Log in to your vault" : "Create your account"}</h2><p>{mode === "login" ? "Your school files are waiting for you." : "Make a personal space for your school files."}</p></div>
          <form onSubmit={submitAuth} className="auth-form">
            {mode === "signup" && <label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" autoComplete="name" required /></label>}
            <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
            <button className="primary-btn full-btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"} <span>→</span></button>
          </form>
          <div className="switch-auth">{mode === "login" ? "New to StudyVault?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setNotice(null); }}>{mode === "login" ? "Create an account" : "Log in"}</button></div>
          <div className="auth-privacy"><LockKeyhole size={14} /> Your files are stored in a private vault.</div>
          {notice && <div className={`notice ${notice.kind}`}><AlertCircle size={17}/>{notice.text}</div>}
        </div>
        <p className="auth-bottom">For your schoolwork · Built for every screen</p>
      </section>
    </main>
  );

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Archive size={23} /></div><span>StudyVault</span><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
        <div className="nav-label">WORKSPACE</div>
        <button className="nav-item active" onClick={() => setMobileNav(false)}><FolderOpen size={18}/> My files</button>
        <div className="sidebar-bottom">
          <div className="storage-card"><div className="storage-icon"><ShieldCheck size={18}/></div><b>Your vault is private</b><p>Only you can access files in your account.</p><div className="storage-meter"><span style={{ width: `${Math.min(totalBytes / (500 * 1024 * 1024) * 100, 100)}%` }}/></div><small>{formatBytes(totalBytes)} stored · 500 MB guide</small></div>
          <div className="user-row"><div className="avatar">{(session.user.email || "S").charAt(0).toUpperCase()}</div><div className="user-details"><b>{session.user.user_metadata?.full_name || "My account"}</b><small>{session.user.email}</small></div><button className="icon-btn" onClick={logout} title="Log out" aria-label="Log out"><LogOut size={17}/></button></div>
        </div>
      </aside>
      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close menu" />}
      <section className="main-panel">
        <header className="topbar"><button className="mobile-menu icon-btn" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>My files</b></div><div className="top-actions"><span className="secure-label"><ShieldCheck size={15}/> Private vault</span><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button></div></header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>My files</h1><p>Keep your school activities close, wherever you are.</p></div><button className="primary-btn upload-top" onClick={() => document.getElementById("file-picker")?.click()} disabled={busy}><UploadCloud size={18}/> Upload files</button></div>
          <div className="stats-grid"><div className="stat-card"><div className="stat-icon purple"><FolderOpen size={19}/></div><div><small>Total files</small><strong>{files.length}</strong></div></div><div className="stat-card"><div className="stat-icon blue"><HardDrive size={19}/></div><div><small>Storage used</small><strong>{formatBytes(totalBytes)}</strong></div></div><div className="stat-card"><div className="stat-icon green"><ShieldCheck size={19}/></div><div><small>Privacy</small><strong>Protected</strong></div></div></div>
          <div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); }}>
            <input id="file-picker" type="file" multiple hidden onChange={e => { if (e.target.files) uploadFiles(e.target.files); e.currentTarget.value = ""; }}/>
            <div className="upload-circle"><UploadCloud size={25}/></div><div className="drop-copy"><b>{busy ? "Working on your files…" : "Drop files here to upload"}</b><p>or choose files from your device. Up to 50 MB per file.</p></div><button className="outline-btn" onClick={() => document.getElementById("file-picker")?.click()} disabled={busy}>Browse files</button>
          </div>
          <div className="files-heading"><div><h2>Your documents</h2><p>Files saved to your personal vault</p></div><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"/></div></div>
          <div className="file-table">
            <div className="file-table-head"><span>FILE NAME</span><span>SIZE</span><span>DATE ADDED</span><span className="actions-heading">ACTIONS</span></div>
            {loadingFiles ? <div className="empty-state"><div className="spinner"/><p>Loading your files…</p></div> : filteredFiles.length === 0 ? <div className="empty-state"><div className="empty-icon"><FolderOpen size={25}/></div><b>{search ? "No files found" : "Your vault is ready"}</b><p>{search ? "Try a different file name." : "Upload your first school activity to get started."}</p><button className="text-btn" onClick={() => document.getElementById("file-picker")?.click()}>Upload a file <span>→</span></button></div> : filteredFiles.map(file => <div className="file-row" key={file.name}><div className="file-name"><div className="file-icon">{fileIcon(file.name)}</div><div><b title={file.name}>{file.name.replace(/^\d+-/, "")}</b><small>{file.metadata?.mimetype || "File"}</small></div></div><span className="file-size">{formatBytes(file.metadata?.size || 0)}</span><span className="file-date">{prettyDate(file.created_at)}</span><div className="file-actions"><button className="icon-btn download-btn" onClick={() => downloadFile(file)} title="Download file" aria-label={`Download ${file.name}`}><ArrowDownToLine size={17}/></button><button className="icon-btn delete-btn" onClick={() => deleteFile(file)} title="Delete file" aria-label={`Delete ${file.name}`}><Trash2 size={17}/></button></div></div>)}
          </div>
          <div className="bottom-note"><LockKeyhole size={14}/> Your files are private to your account. Remember to log out on shared computers.</div>
        </div>
      </section>
      {notice && <div className={`toast ${notice.kind}`}><CheckCircle2 size={18}/><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16}/></button></div>}
    </main>
  );
}

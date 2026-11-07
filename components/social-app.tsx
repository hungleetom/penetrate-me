"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Bell,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Compass,
  Crown,
  Ellipsis,
  Heart,
  Home,
  ImagePlus,
  Images,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  Trash2,
  User,
  UserRound,
  Users,
  WandSparkles,
  X,
  Pencil,
  Share2,
  Globe2,
  Coffee,
  SlidersHorizontal,
  RefreshCw,
  CircleCheck,
  BadgeCheck,
  Ban,
  ExternalLink,
  Upload,
  CalendarDays,
} from "lucide-react";

type Any = Record<string, any>;
type Notice = { text: string; error?: boolean } | null;
const FALLBACK_AVATAR = "/media/avatar-1.svg";
const FALLBACK_COVER = "/media/scene-1.svg";
const dateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
function ago(s: string) {
  const n = Math.max(0, (Date.now() - new Date(s).getTime()) / 1000);
  return n < 60
    ? "Just now"
    : n < 3600
      ? `${Math.floor(n / 60)}m`
      : n < 86400
        ? `${Math.floor(n / 3600)}h`
        : n < 604800
          ? `${Math.floor(n / 86400)}d`
          : new Date(s).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
}
function avatar(u?: Any) {
  return u?.profile?.avatar || u?.avatar || FALLBACK_AVATAR;
}
function display(u?: Any) {
  return u?.displayName || u?.username || "A friend";
}
function verified(u?: Any) {
  return !!u?.verification?.isVerified || !!u?.isVerified;
}
function interests(u?: Any): string[] {
  const v = u?.profile?.interests || u?.interests || [];
  if (Array.isArray(v)) return v;
  try {
    const j = JSON.parse(v);
    if (Array.isArray(j)) return j;
  } catch {}
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
async function api(path: string, method = "GET", data?: any) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers:
      data instanceof FormData
        ? undefined
        : data
          ? { "Content-Type": "application/json" }
          : undefined,
    body:
      data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
  });
  const out = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(out.error || `Something went wrong (${response.status}).`);
  return out;
}
function useRemote(url: string | null, refresh = 0) {
  const [data, setData] = useState<Any | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (!url) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    api(url)
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, refresh]);
  return { data, error, loading, setData };
}
type Shared = {
  me: Any | null;
  notify: (text: string, error?: boolean) => void;
  reloadMe: () => Promise<void>;
  version: number;
  bump: () => void;
  requireUser: () => boolean;
};
function Avatar({
  user,
  size = "",
  className = "",
}: {
  user?: Any;
  size?: string;
  className?: string;
}) {
  return (
    <img
      className={`avatar ${size} ${className}`}
      src={avatar(user)}
      alt={`${display(user)}'s avatar`}
      onError={(e) => {
        e.currentTarget.src = FALLBACK_AVATAR;
      }}
    />
  );
}
function Verified({ user }: { user?: Any }) {
  return verified(user) ? (
    <span className="verified" aria-label="Verified account">
      <BadgeCheck
        size={14}
        fill="currentColor"
        stroke="#13161f"
        strokeWidth={1.6}
      />
    </span>
  ) : null;
}
function Spinner() {
  return (
    <div className="loading">
      <div className="spinner" />
      Getting the good stuff…
    </div>
  );
}
function Empty({
  icon: Icon = Sparkles,
  title,
  body,
  children,
}: {
  icon?: any;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon size={31} />
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </div>
  );
}
function ErrorNote({ text }: { text: string }) {
  return text ? (
    <div className="notice error-note" role="alert">
      {text}
    </div>
  ) : null;
}
function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-top">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <div className="header-actions">{children}</div>
    </header>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function SocialApp() {
  const path = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [me, setMe] = useState<Any | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [version, setVersion] = useState(0);
  const [unread, setUnread] = useState(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text: string, error = false) => {
    setNotice({ text, error });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4500);
  }, []);
  const reloadMe = useCallback(async () => {
    const r = await api("/api/me");
    setMe(r.user);
    setReady(true);
  }, []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    reloadMe().catch(() => setReady(true));
  }, [reloadMe]);
  useEffect(() => {
    if (me)
      api("/api/notifications")
        .then((r) =>
          setUnread((r.notifications || []).filter((n: Any) => !n.read).length),
        )
        .catch(() => {});
    else setUnread(0);
  }, [me, version]);
  const requireUser = useCallback(() => {
    if (me) return true;
    router.push("/login");
    return false;
  }, [me, router]);
  const shared = { me, notify, reloadMe, version, bump, requireUser };
  const [search, setSearch] = useState("");
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          '[aria-label="Search penetrate.me"]',
        );
        if (input && input.getClientRects().length) input.focus();
        else router.push("/explore");
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [router]);
  const nav = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/photos", label: "Photos", icon: Images },
    {
      href: me ? `/u/${me.username}` : "/login",
      label: "Profile",
      icon: UserRound,
    },
  ];
  const active = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);
  const logout = async () => {
    try {
      await api("/api/auth/logout", "POST");
      setMe(null);
      bump();
      router.push("/");
      notify("You’re signed out. See you around.");
    } catch (e: any) {
      notify(e.message, true);
    }
  };
  const compose = () => {
    if (!requireUser()) return;
    router.push("/");
    setTimeout(() => document.getElementById("post-composer")?.focus(), 100);
  };
  let content: React.ReactNode;
  if (path === "/login" || path === "/register" || path === "/reset")
    content = <AuthPage mode={path.slice(1)} {...shared} />;
  else if (path.startsWith("/u/") || path.startsWith("/profile/"))
    content = (
      <ProfilePage
        username={decodeURIComponent(path.split("/")[2])}
        {...shared}
      />
    );
  else if (path === "/messages" || path.startsWith("/messages/"))
    content = <MessagesPage conversationId={path.split("/")[2]} {...shared} />;
  else if (path === "/photos" || path.startsWith("/photos/"))
    content = <PhotosPage albumId={path.split("/")[2]} {...shared} />;
  else if (path === "/notifications")
    content = <NotificationsPage {...shared} />;
  else if (path === "/settings") content = <SettingsPage {...shared} />;
  else if (path === "/explore" || path === "/search")
    content = <ExplorePage key={path + searchParams.toString()} {...shared} />;
  else if (path === "/") content = <FeedPage {...shared} />;
  else
    content = (
      <>
        <PageTitle eyebrow="TAKE THE SCENIC ROUTE" title="A little lost?" />
        <div className="panel">
          <Empty
            title="This corner is quiet"
            body="Head back to your feed and see what everyone’s up to."
          >
            <Link href="/" className="primary-button">
              Back to home
            </Link>
          </Empty>
        </div>
      </>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            ↗
          </span>
          <span className="brand-word">
            penetrate<span className="brand-dot">.me</span>
          </span>
        </Link>
        <nav className="nav-list" aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className={`nav-link ${active(href) ? "active" : ""}`}
            >
              <Icon size={21} />
              <span>{label}</span>
              {label === "Notifications" && unread > 0 && (
                <b className="nav-badge">{unread > 99 ? "99+" : unread}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="nav-divider" />
        <Link
          href="/settings"
          className={`nav-link ${active("/settings") ? "active" : ""}`}
        >
          <Settings size={21} />
          <span>Settings</span>
        </Link>
        <button className="primary-button sidebar-compose" onClick={compose}>
          <Plus size={18} />
          Create a post
        </button>
        <div className="sidebar-bottom">
          <div className="mini-premium">
            <div className="eyebrow">
              <Sparkles size={12} />A LITTLE EXTRA YOU
            </div>
            <h3>Ordinary is overrated.</h3>
            <p>
              More personality. More possibilities.
              <br />
              Meet penetrate.me Premium.
            </p>
            <Link href="/settings#premium">
              Explore Premium <ArrowRight size={12} />
            </Link>
          </div>
          <div className="sidebar-account">
            {me ? (
              <>
                <Link href={`/u/${me.username}`}>
                  <Avatar user={me} />
                </Link>
                <Link href={`/u/${me.username}`} className="account-text">
                  <strong>{display(me)}</strong>
                  <span>@{me.username}</span>
                </Link>
                <button
                  className="icon-button"
                  onClick={logout}
                  aria-label="Sign out"
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <>
                <Avatar
                  user={{
                    profile: { avatar: "/media/avatar-1.svg" },
                    displayName: "Guest",
                  }}
                />
                <div className="account-text">
                  <strong>Your people are here.</strong>
                  <span>Come say hello.</span>
                </div>
                <Link
                  href="/login"
                  className="icon-button"
                  aria-label="Sign in"
                >
                  <LogIn size={19} />
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>
      <div className="main-column">
        <div className="mobile-header">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              ↗
            </span>
            <span className="brand-word">
              penetrate<span className="brand-dot">.me</span>
            </span>
          </Link>
          <Link
            href={me ? "/settings" : "/login"}
            className="icon-button"
            aria-label={me ? "Account settings" : "Sign in"}
          >
            {me ? <Avatar user={me} size="small" /> : <LogIn size={21} />}
          </Link>
        </div>
        {!ready ? <Spinner /> : content}
      </div>
      <aside className="right-column">
        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(search)}`);
          }}
        >
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search penetrate.me"
            aria-label="Search penetrate.me"
          />
          <span className="search-key">Ctrl K</span>
        </form>
        <RightSidebar {...shared} />
      </aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav
          .filter((n) => n.label !== "Photos")
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className={active(href) ? "active" : ""}
            >
              <Icon />
            </Link>
          ))}
      </nav>
      {notice && (
        <div className={`toast ${notice.error ? "error" : ""}`} role="status">
          {notice.error ? <CircleHelp size={16} /> : <Check size={16} />}
          <span>{notice.text}</span>
        </div>
      )}
    </div>
  );
}

function RightSidebar(s: Shared) {
  const { data } = useRemote("/api/users", s.version);
  const people = (data?.users || [])
    .filter((u: Any) => u.id !== s.me?.id)
    .slice(0, 4);
  return (
    <>
      <section className="side-card panel">
        <div className="side-card-title">
          <h2>People to know</h2>
          <Users size={15} color="#77748f" />
        </div>
        {people.map((u: Any) => (
          <SuggestedPerson key={u.id} user={u} {...s} />
        ))}
        <Link className="side-card-footer" href="/explore">
          Discover more people <span aria-hidden>→</span>
        </Link>
      </section>
      <section className="side-card panel">
        <div className="side-card-title">
          <h2>What’s happening</h2>
          <Sparkles size={15} color="#8c77b7" />
        </div>
        {[
          {
            tag: "#WeekendWanderings",
            category: "OUT & ABOUT",
            count: "The scenic route is calling",
          },
          {
            tag: "#CoffeeThoughts",
            category: "THE DAILY BREW",
            count: "For the third-cup crowd",
          },
          {
            tag: "#BuildInPublic",
            category: "CREATIVE CORNER",
            count: "Something good is taking shape",
          },
        ].map((t, i) => (
          <Link
            href={`/search?q=${encodeURIComponent(t.tag.slice(1))}&type=posts`}
            className="trend"
            key={t.tag}
          >
            <div className="trend-meta">
              <span>{t.category}</span>
              <span>0{i + 1}</span>
            </div>
            <strong>{t.tag}</strong>
            <span>{t.count}</span>
          </Link>
        ))}
      </section>
      <section className="side-banner">
        <span className="eyebrow">LESS POLISHED. MORE YOU.</span>
        <h3>
          Your corner
          <br />
          of the internet.
        </h3>
        <p>The big thoughts, the small wins, and everything in between.</p>
        <Link href={s.me ? `/u/${s.me.username}` : "/register"}>
          {s.me ? "Make it yours" : "Find your people"}
          <ArrowRight size={12} />
        </Link>
      </section>
      <div className="footer-links">
        <Link href="/explore">Explore</Link>
        <Link href="/discover">Discover</Link>
        <Link href="/settings">Privacy preferences</Link>
        <Link href="/photos">Photo community</Link>
      </div>
      <p className="footer-copy">
        © 2026 penetrate.me
        <br />
        The internet’s least secure social network.
      </p>
    </>
  );
}
function SuggestedPerson({ user, ...s }: Shared & { user: Any }) {
  const [following, setFollowing] = useState(!!user.isFollowing);
  useEffect(() => {
    setFollowing(!!user.isFollowing);
    if (s.me && user.isFollowing === undefined)
      api("/api/users/" + encodeURIComponent(user.username))
        .then((r) => setFollowing(!!r.isFollowing))
        .catch(() => {});
  }, [user.isFollowing, user.username, s.me?.id]);
  const toggle = async () => {
    if (!s.requireUser()) return;
    try {
      const r = await api(`/api/users/${user.id}/follow`, "POST");
      setFollowing(r.following);
      s.notify(
        r.following
          ? `You’re now following ${display(user)}.`
          : `You unfollowed ${display(user)}.`,
      );
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  return (
    <div className="suggested-user">
      <Link href={`/u/${user.username}`}>
        <Avatar user={user} size="small" />
      </Link>
      <Link className="person-text" href={`/u/${user.username}`}>
        <strong>
          {display(user)}
          <Verified user={user} />
        </strong>
        <span>@{user.username}</span>
      </Link>
      <button
        className={`follow-small ${following ? "following" : ""}`}
        onClick={toggle}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

function FeedPage(s: Shared) {
  const [feed, setFeed] = useState("all");
  const [refresh, setRefresh] = useState(0);
  const { data, error, loading } = useRemote(
    `/api/posts${feed === "following" ? "?feed=following" : ""}`,
    s.version + refresh,
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR DAILY DOSE OF THE INTERNET"
        title="A little less filtered."
      >
        <span className="online-pill">Your people, your place</span>
        <button
          className="icon-button"
          onClick={() => setRefresh((v) => v + 1)}
          aria-label="Refresh feed"
        >
          <RefreshCw size={17} />
        </button>
      </PageTitle>
      <div className="welcome-card">
        <div>
          <h2>
            {s.me
              ? `Hey ${display(s.me).split(" ")[0]}, welcome back.`
              : "Good people. Everyday stories."}
            <span style={{ color: "#c6a6fc" }}> ✦</span>
          </h2>
          <p>No perfect lives required. Just show up as yourself.</p>
        </div>
        <div className="welcome-art">
          <WandSparkles size={33} strokeWidth={1.4} />
        </div>
      </div>
      <Composer {...s} onCreated={() => setRefresh((v) => v + 1)} />
      <div className="tabs">
        <button
          className={`tab ${feed === "all" ? "active" : ""}`}
          onClick={() => setFeed("all")}
        >
          <Sparkles size={14} />
          For you
        </button>
        <button
          className={`tab ${feed === "following" ? "active" : ""}`}
          onClick={() => {
            if (s.requireUser()) setFeed("following");
          }}
        >
          Following
        </button>
        <button
          className="feed-tools icon-button"
          onClick={() => setRefresh((v) => v + 1)}
          aria-label="Refresh posts"
        >
          <ArrowDownUp size={14} />
        </button>
      </div>
      <ErrorNote text={error} />
      {loading && !data ? (
        <Spinner />
      ) : data?.posts?.length ? (
        data.posts.map((p: Any) => (
          <PostCard
            key={p.id}
            post={p}
            {...s}
            onChange={() => setRefresh((v) => v + 1)}
          />
        ))
      ) : (
        <div className="panel">
          <Empty
            icon={Users}
            title={
              feed === "following"
                ? "Your feed starts with a follow"
                : "A fresh start"
            }
            body={
              feed === "following"
                ? "Find a few familiar faces in Explore. Their stories will show up here."
                : "There are no posts here yet. Make the first one."
            }
          >
            <Link className="primary-button" href="/explore">
              Explore people
            </Link>
          </Empty>
        </div>
      )}
    </>
  );
}
function Composer({ onCreated, ...s }: Shared & { onCreated: () => void }) {
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => {
    if (!file || !s.requireUser()) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api("/api/upload", "POST", form);
      setImage(r.url);
      s.notify("Photo ready to share.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!s.requireUser() || (!body.trim() && !image)) return;
    setBusy(true);
    try {
      await api("/api/posts", "POST", {
        body: body.trim(),
        image: image || null,
      });
      setBody("");
      setImage("");
      onCreated();
      s.notify("A little piece of your day, shared.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="composer panel" onSubmit={submit}>
      <div className="composer-main">
        <Avatar user={s.me || { displayName: "Guest" }} />
        {s.me ? (
          <textarea
            id="post-composer"
            aria-label="Write a post"
            placeholder="What’s on your mind?"
            value={body}
            maxLength={5000}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="composer-guest"
            onClick={s.requireUser}
          >
            What’s on your mind? Join the conversation.
          </button>
        )}
      </div>
      {image && (
        <div className="composer-attachment">
          <img src={image} alt="Post attachment preview" />
          <span>Ready when you are.</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Remove photo"
            onClick={() => setImage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="composer-actions">
        <div className="composer-tools">
          <label className="composer-tool file-label">
            <ImagePlus size={17} />
            Photo
            <input
              type="file"
              aria-label="Attach post photo"
              accept="image/*,.html"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          <Link className="composer-tool" href="/photos">
            <Images size={17} />
            Album
          </Link>
          <Link className="composer-tool" href="/discover">
            <Compass size={17} />
            Discover
          </Link>
        </div>
        <button
          className="primary-button"
          disabled={busy || (!!s.me && !body.trim() && !image)}
          type="submit"
        >
          {busy ? (
            <LoaderCircle size={14} className="spin" />
          ) : (
            <>
              Post <ArrowRight size={13} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function PostCard({
  post,
  onChange,
  ...s
}: Shared & { post: Any; onChange: () => void }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [edit, setEdit] = useState(false);
  const [body, setBody] = useState(post.body || "");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
  const [lightbox, setLightbox] = useState(false);
  const owned = s.me?.id === post.userId || s.me?.id === post.author?.id;
  useEffect(() => {
    setLiked(!!post.liked);
    setLikeCount(post._count?.likes || 0);
  }, [post.liked, post._count?.likes]);
  const like = async () => {
    if (!s.requireUser()) return;
    try {
      const r = await api(`/api/posts/${post.id}/like`, "POST");
      setLiked(r.liked);
      setLikeCount(r.count);
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.requireUser() || !comment.trim()) return;
    setBusy(true);
    try {
      await api(`/api/posts/${post.id}/comments`, "POST", { body: comment });
      setComment("");
      onChange();
      s.notify("Reply added.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setMenu(false);
    try {
      await api(`/api/posts/${post.id}`, "DELETE");
      onChange();
      s.notify("Post deleted.");
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/posts/${post.id}`, "PATCH", { body });
      setEdit(false);
      onChange();
      s.notify("Post updated.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/u/${post.author?.username}#${post.id}`,
      );
      s.notify("Post link copied.");
    } catch {
      s.notify("Open the author’s profile to share this post.");
    }
  };
  return (
    <article className="post-card panel" id={post.id}>
      <header className="post-header">
        <Link href={`/u/${post.author?.username}`}>
          <Avatar user={post.author} />
        </Link>
        <div className="post-author-info">
          <div className="post-name-row">
            <Link className="post-author" href={`/u/${post.author?.username}`}>
              {display(post.author)}
            </Link>
            <Verified user={post.author} />
            {post.author?.premium?.status === "LIFETIME" && (
              <Crown size={12} color="#d0b474" />
            )}
          </div>
          <div className="post-time">
            <Link href={`/u/${post.author?.username}`}>
              @{post.author?.username}
            </Link>
            <span>·</span>
            <time title={dateTime(post.createdAt)}>{ago(post.createdAt)}</time>
          </div>
        </div>
        <div className="post-menu">
          <button
            className="icon-button"
            onClick={() => setMenu(!menu)}
            aria-label={`More options for ${post.id}`}
          >
            <Ellipsis size={19} />
          </button>
          {menu && (
            <div className="dropdown">
              <button
                onClick={() => {
                  share();
                  setMenu(false);
                }}
              >
                <Share2 size={14} />
                Copy post link
              </button>
              {owned && (
                <>
                  <button
                    onClick={() => {
                      setEdit(true);
                      setMenu(false);
                    }}
                  >
                    <Pencil size={14} />
                    Edit post
                  </button>
                  <button className="danger" onClick={remove}>
                    <Trash2 size={14} />
                    Delete post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <p className="post-body">
        {String(post.body || "")
          .split(/(#[\w]+)/g)
          .map((part, i) =>
            part.startsWith("#") ? (
              <Link
                className="text-link"
                href={`/search?q=${encodeURIComponent(part.slice(1))}&type=posts`}
                key={i}
              >
                {part}
              </Link>
            ) : (
              <React.Fragment key={i}>{part}</React.Fragment>
            ),
          )}
      </p>
      {post.image && (
        <button
          className="post-photo"
          onClick={() => setLightbox(true)}
          aria-label="View post photo"
        >
          <img
            src={post.image}
            alt={`A moment shared by ${display(post.author)}`}
            loading="lazy"
          />
          <span className="photo-caption">A LITTLE MOMENT, WORTH KEEPING</span>
        </button>
      )}
      <div className="post-actions">
        <button
          className={`post-action ${liked ? "liked" : ""}`}
          onClick={like}
          aria-label={liked ? `Unlike ${post.id}` : `Like ${post.id}`}
        >
          <Heart size={18} />
          <span>{likeCount || "Like"}</span>
        </button>
        <button
          className="post-action"
          onClick={() => setCommentsOpen(!commentsOpen)}
          aria-label={`Comments on ${post.id}`}
        >
          <MessageCircle size={18} />
          <span>
            {post._count?.comments || post.comments?.length || "Reply"}
          </span>
        </button>
        <button
          className="post-action"
          onClick={share}
          aria-label={`Share ${post.id}`}
        >
          <Share2 size={16} />
          <span>Share</span>
        </button>
      </div>
      {commentsOpen && (
        <div className="comment-list">
          {(post.comments || []).map((c: Any) => (
            <div className="comment" key={c.id}>
              <Link href={`/u/${c.author?.username}`}>
                <Avatar user={c.author} size="small" />
              </Link>
              <div className="comment-content">
                <strong>{display(c.author)}</strong>
                <span>{ago(c.createdAt)}</span>
                <div
                  className="comment-body"
                  dangerouslySetInnerHTML={{ __html: c.body }}
                />
              </div>
            </div>
          ))}
          {s.me ? (
            <form className="comment-form" onSubmit={addComment}>
              <Avatar user={s.me} size="small" />
              <input
                aria-label={`Reply to ${post.id}`}
                placeholder="Add a little to the conversation…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                maxLength={3000}
              />
              <button disabled={busy} aria-label="Send reply">
                <Send size={15} />
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-button">
              Sign in to join the conversation →
            </Link>
          )}
        </div>
      )}
      {edit && (
        <Modal title="Edit your post" onClose={() => setEdit(false)}>
          <form onSubmit={save}>
            <label className="field">
              <span>What’s on your mind?</span>
              <textarea
                aria-label="Edit post text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={5000}
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEdit(false)}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={busy}>
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}
      {lightbox && (
        <div className="modal-backdrop" onClick={() => setLightbox(false)}>
          <div
            className="modal modal-image"
            role="dialog"
            aria-label="Photo preview"
          >
            <button
              className="icon-button"
              aria-label="Close photo preview"
              onClick={() => setLightbox(false)}
            >
              <X />
            </button>
            <img src={post.image} alt={`Photo by ${display(post.author)}`} />
          </div>
        </div>
      )}
    </article>
  );
}

function AuthPage({ mode, ...s }: Shared & { mode: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    email: "",
    token: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetStep, setResetStep] = useState(false);
  const isRegister = mode === "register",
    isReset = mode === "reset";
  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isReset) {
        const r = await api(
          "/api/auth/reset",
          "POST",
          resetStep
            ? { token: form.token, password: form.password }
            : { email: form.email },
        );
        setMessage(
          r.message || "Your password has been updated. You can sign in now.",
        );
        if (!resetStep) {
          setResetStep(true);
          if (r.resetToken) update("token", r.resetToken);
        } else {
          await s.reloadMe();
          s.bump();
          router.push("/login");
        }
      } else {
        await api(
          `/api/auth/${isRegister ? "register" : "login"}`,
          "POST",
          isRegister
            ? form
            : { username: form.username, password: form.password },
        );
        await s.reloadMe();
        s.bump();
        router.push("/");
        s.notify(
          isRegister
            ? "You’re in. Make yourself at home."
            : "Welcome back. Your people missed you.",
        );
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card panel">
        <div className="auth-symbol">
          {isReset ? (
            <KeyRound size={25} />
          ) : isRegister ? (
            <Sparkles size={26} />
          ) : (
            <Coffee size={26} />
          )}
        </div>
        <h1>
          {isReset
            ? "A fresh start."
            : isRegister
              ? "Your people are here."
              : "Hey, you’re back."}
        </h1>
        <p className="auth-subtitle">
          {isReset
            ? "Forgot your password? It happens to the best of us. Let’s get you back to your corner of the internet."
            : isRegister
              ? "Big thoughts. Small wins. Questionable memes. There’s room for all of it — and you."
              : "The group chat has opinions. Your coffee is getting cold. Let’s catch you up."}
        </p>
        <ErrorNote text={error} />
        {message && <div className="notice">{message}</div>}
        <form onSubmit={submit}>
          {isRegister && (
            <>
              <label className="field">
                <span>Display name</span>
                <input
                  autoComplete="name"
                  aria-label="Display name"
                  value={form.displayName}
                  onChange={(e) => update("displayName", e.target.value)}
                  placeholder="What should we call you?"
                  required
                  maxLength={80}
                />
              </label>
              <label className="field">
                <span>Email address</span>
                <input
                  type="email"
                  autoComplete="email"
                  aria-label="Email address"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@example.test"
                  required
                />
              </label>
            </>
          )}
          {isReset ? (
            resetStep ? (
              <label className="field">
                <span>Reset token</span>
                <input
                  aria-label="Reset token"
                  value={form.token}
                  onChange={(e) => update("token", e.target.value)}
                  required
                  placeholder="Paste the token from the local mail simulation"
                />
              </label>
            ) : (
              <label className="field">
                <span>Email address</span>
                <input
                  type="email"
                  aria-label="Email address"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                  placeholder="you@example.test"
                />
              </label>
            )
          ) : (
            <label className="field">
              <span>Username</span>
              <input
                aria-label="Username"
                autoComplete="username"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="Your username, without the @"
                required
                pattern={isRegister ? "[a-zA-Z0-9_.]{3,32}" : undefined}
              />
            </label>
          )}
          {(!isReset || resetStep) && (
            <label className="field">
              <span>{isReset ? "New password" : "Password"}</span>
              <input
                aria-label={isReset ? "New password" : "Password"}
                autoComplete={
                  isRegister || isReset ? "new-password" : "current-password"
                }
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={isRegister || isReset ? 8 : undefined}
                placeholder={
                  isRegister ? "At least 8 characters" : "Your password"
                }
              />
            </label>
          )}
          {!isRegister && !isReset && (
            <Link href="/reset" className="auth-forgot">
              Forgot your password?
            </Link>
          )}
          <button className="primary-button" disabled={busy}>
            {busy
              ? "One moment…"
              : isReset
                ? resetStep
                  ? "Set new password"
                  : "Send reset instructions"
                : isRegister
                  ? "Create your account"
                  : "Sign in"}
            {!busy && <ArrowRight size={15} />}
          </button>
        </form>
        <p className="auth-link">
          {isReset ? (
            <Link href="/login">Back to sign in</Link>
          ) : isRegister ? (
            <>
              Already part of the conversation?
              <Link href="/login">Sign in</Link>
            </>
          ) : (
            <>
              New around here?<Link href="/register">Find your people</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function ProfilePage({ username, ...s }: Shared & { username: string }) {
  const [refresh, setRefresh] = useState(0);
  const { data, error, loading } = useRemote(
    `/api/users/${encodeURIComponent(username)}`,
    s.version + refresh,
  );
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState("posts");
  const lastScrolledLink = useRef("");
  const router = useRouter();
  const u = data?.user;
  const own = u?.id === s.me?.id;
  useEffect(() => {
    lastScrolledLink.current = "";
  }, [username]);
  useEffect(() => {
    if (data?.user?.username !== username || tab !== "posts") return;
    const fragment = window.location.hash;
    const link = `${username}${fragment}`;
    if (!fragment || lastScrolledLink.current === link) return;
    let id: string;
    try {
      id = decodeURIComponent(fragment.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
      lastScrolledLink.current = link;
    }
  }, [data?.posts, username, tab]);
  const toggleFollow = async () => {
    if (!s.requireUser() || !u) return;
    try {
      const r = await api(`/api/users/${u.id}/follow`, "POST");
      setRefresh((v) => v + 1);
      s.notify(
        r.following
          ? `You’re following ${display(u)}.`
          : `You unfollowed ${display(u)}.`,
      );
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  const block = async () => {
    if (!s.requireUser() || !u) return;
    try {
      const r = await api(`/api/users/${u.id}/block`, "POST");
      setRefresh((v) => v + 1);
      s.notify(
        r.blocked ? `${display(u)} is now blocked.` : "Account unblocked.",
      );
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  const message = async () => {
    if (!s.requireUser() || !u) return;
    try {
      const r = await api("/api/conversations", "POST", { userId: u.id });
      router.push(`/messages/${r.conversation.id}`);
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE MORE ABOUT"
        title={u ? display(u) : "Your people"}
      >
        <Link href="/" className="icon-button" aria-label="Back to feed">
          <ArrowLeft size={19} />
        </Link>
      </PageTitle>
      <ErrorNote text={error} />
      {loading && !u ? (
        <Spinner />
      ) : u ? (
        <>
          <section className="profile-head panel">
            <div className="profile-cover">
              <img
                src={u.profile?.cover || FALLBACK_COVER}
                alt={`${display(u)}'s cover`}
              />
            </div>
            <div className="profile-info">
              <div className="profile-avatar-row">
                <Avatar user={u} size="huge" />
                <div className="profile-buttons">
                  {own ? (
                    <button
                      className="secondary-button"
                      onClick={() => setEdit(true)}
                    >
                      <Pencil size={13} />
                      Edit profile
                    </button>
                  ) : (
                    <>
                      <button
                        className="secondary-button"
                        onClick={message}
                        aria-label={`Message ${display(u)}`}
                      >
                        <Mail size={15} />
                      </button>
                      <button
                        className="secondary-button"
                        onClick={block}
                        aria-label={
                          data?.isBlocked ? "Unblock account" : "Block account"
                        }
                      >
                        <Ban size={14} />
                      </button>
                      <button
                        className={
                          data?.isFollowing
                            ? "secondary-button"
                            : "primary-button"
                        }
                        onClick={toggleFollow}
                      >
                        {data?.isFollowing ? (
                          <>
                            <Check size={13} />
                            Following
                          </>
                        ) : (
                          <>
                            <Plus size={13} />
                            Follow
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <h2 className="profile-title">
                {display(u)}
                <Verified user={u} />
                {u.premium?.status &&
                  u.premium.status !== "NONE" &&
                  u.premium.status !== "STANDARD" &&
                  u.premium.status !== "FREE" && (
                    <Crown size={18} color="#c9ac77" />
                  )}
              </h2>
              <p className="profile-handle">@{u.username}</p>
              <p className="profile-bio">
                {u.profile?.bio || "Still figuring out what to put here."}
              </p>
              <div className="profile-details">
                <span>
                  <Globe2 size={13} />
                  Somewhere on the internet
                </span>
                <span>
                  <CalendarDays size={13} />
                  Joined{" "}
                  {u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })
                    : "November 2026"}
                </span>
                {u.settings?.privateAccount && (
                  <span>
                    <LockKeyhole size={12} />
                    Private account
                  </span>
                )}
              </div>
              <div className="interest-tags">
                {interests(u).map((i) => (
                  <Link
                    className="interest-tag"
                    href={`/search?q=${encodeURIComponent(i)}&type=posts`}
                    key={i}
                  >
                    {i}
                  </Link>
                ))}
                {u.verification?.profileBadge && (
                  <span className="badge">{u.verification.profileBadge}</span>
                )}
              </div>
              <div className="profile-stats">
                <span>
                  <strong>{u._count?.posts ?? data.posts?.length ?? 0}</strong>
                  posts
                </span>
                <span>
                  <strong>{u._count?.followers ?? 0}</strong>followers
                </span>
                <span>
                  <strong>{u._count?.following ?? 0}</strong>following
                </span>
              </div>
            </div>
          </section>
          <div className="tabs profile-tabs">
            <button
              className={`tab ${tab === "posts" ? "active" : ""}`}
              onClick={() => setTab("posts")}
            >
              <MessageSquare size={14} />
              Posts
            </button>
            <button
              className={`tab ${tab === "photos" ? "active" : ""}`}
              onClick={() => setTab("photos")}
            >
              <Images size={14} />
              Photos
            </button>
            <button
              className={`tab ${tab === "about" ? "active" : ""}`}
              onClick={() => setTab("about")}
            >
              <User size={14} />
              About
            </button>
          </div>
          {tab === "posts" ? (
            data.posts?.length ? (
              data.posts.map((p: Any) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onChange={() => setRefresh((v) => v + 1)}
                  {...s}
                />
              ))
            ) : (
              <div className="panel">
                <Empty
                  icon={
                    u.settings?.privateAccount ? LockKeyhole : MessageCircle
                  }
                  title={
                    data.isBlocked
                      ? "A little space"
                      : u.settings?.privateAccount && !own
                        ? "A quieter corner"
                        : "The story starts here"
                  }
                  body={
                    data.isBlocked
                      ? "You’ve blocked this account. Unblock to reconnect."
                      : u.settings?.privateAccount && !own
                        ? "This account keeps their stories close."
                        : "No posts yet. Check back for a little everyday life."
                  }
                />
              </div>
            )
          ) : tab === "photos" ? (
            <AlbumListing user={username} {...s} />
          ) : (
            <div className="settings-card panel">
              <h2>About {display(u).split(" ")[0]}</h2>
              <p className="profile-bio">{u.profile?.bio}</p>
              <div className="interest-tags">
                {interests(u).map((i) => (
                  <span key={i} className="interest-tag">
                    {i}
                  </span>
                ))}
              </div>
              <p className="settings-description mt">
                Making a little space for the good things, one post at a time.
              </p>
            </div>
          )}
          {edit && (
            <EditProfile
              user={u}
              onClose={() => setEdit(false)}
              onSaved={async () => {
                setEdit(false);
                setRefresh((v) => v + 1);
                await s.reloadMe();
              }}
              {...s}
            />
          )}
        </>
      ) : !error ? (
        <Empty
          title="We haven’t met them yet"
          body="Try searching for another username."
        />
      ) : null}
    </>
  );
}
function EditProfile({
  user,
  onClose,
  onSaved,
  ...s
}: Shared & { user: Any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    displayName: user.displayName,
    bio: user.profile?.bio || "",
    interests: interests(user).join(", "),
    avatar: avatar(user),
    cover: user.profile?.cover || FALLBACK_COVER,
  });
  const [busy, setBusy] = useState(false);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const upload = async (file: File | undefined, key: string) => {
    if (!file) return;
    setBusy(true);
    try {
      const f = new FormData();
      f.append("file", file);
      const r = await api("/api/upload", "POST", f);
      update(key, r.url);
      s.notify("Image updated. Save your profile to keep it.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/account/profile", "PATCH", {
        displayName: form.displayName,
        bio: form.bio,
        interests: form.interests,
      });
      await api("/api/profile", "PATCH", {
        avatar: form.avatar,
        cover: form.cover,
      });
      await onSaved();
      s.notify("Your profile, a little more you.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Make yourself at home" onClose={onClose}>
      <form onSubmit={save}>
        <div className="row" style={{ marginBottom: 22 }}>
          <img
            className="avatar large"
            src={form.avatar}
            alt="Profile preview"
          />
          <div>
            <label className="secondary-button file-label">
              <Camera size={14} />
              Change photo
              <input
                type="file"
                aria-label="Upload profile photo"
                accept="image/*"
                onChange={(e) => upload(e.target.files?.[0], "avatar")}
              />
            </label>
            <p className="subtle-label">A face your friends will recognize.</p>
          </div>
        </div>
        <label className="field">
          <span>Display name</span>
          <input
            value={form.displayName}
            onChange={(e) => update("displayName", e.target.value)}
            required
            maxLength={80}
          />
        </label>
        <label className="field">
          <span>Bio</span>
          <textarea
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            maxLength={500}
          />
        </label>
        <label className="field">
          <span>Interests</span>
          <input
            value={form.interests}
            aria-label="Interests"
            onChange={(e) => update("interests", e.target.value)}
            placeholder="Photography, coffee, scenic routes"
            maxLength={100}
          />
          <small>Separate your interests with commas.</small>
        </label>
        <label className="secondary-button file-label">
          <ImagePlus size={14} />
          Change cover
          <input
            type="file"
            aria-label="Upload cover image"
            accept="image/*"
            onChange={(e) => upload(e.target.files?.[0], "cover")}
          />
        </label>
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={busy}>
            Save profile
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ExplorePage(s: Shared) {
  const [query, setQuery] = useState("");
  const [committed, setCommitted] = useState("");
  const [kind, setKind] = useState("users");
  const [archive, setArchive] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setQuery(q.get("q") || "");
    setCommitted(q.get("q") || "");
    setKind(q.get("type") || "users");
    setArchive(q.get("archive") === "1");
  }, []);
  const url =
    kind === "accounts"
      ? s.me
        ? `/api/account/lookup?q=${encodeURIComponent(committed)}`
        : null
      : archive
        ? `/api/search/${kind}?q=${encodeURIComponent(committed)}`
        : kind === "users"
          ? `/api/users?query=${encodeURIComponent(committed)}`
          : `/api/posts/search?q=${encodeURIComponent(committed)}`;
  const { data, error, loading } = useRemote(url, s.version + refresh);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setCommitted(query);
    setRefresh((v) => v + 1);
    history.replaceState(
      {},
      "",
      `/search?q=${encodeURIComponent(query)}&type=${kind}${archive ? "&archive=1" : ""}`,
    );
  };
  return (
    <>
      <PageTitle
        eyebrow="THE INTERNET IS A BIG PLACE"
        title="Find your kind of people."
      >
        <Compass size={23} color="#aa91e3" />
      </PageTitle>
      <form className="search-large panel" onSubmit={submit}>
        <div>
          <Search size={18} />
          <input
            aria-label="Search people and posts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              kind === "posts"
                ? "Try coffee, code, or a little chaos…"
                : kind === "accounts"
                  ? "Look up a community account…"
                  : "Names, usernames, or shared interests…"
            }
          />
        </div>
        <button className="primary-button">Search</button>
      </form>
      <div className="search-modes">
        {[
          { value: "users", label: "People", icon: Users },
          { value: "posts", label: "Posts", icon: MessageSquare },
          { value: "accounts", label: "Account lookup", icon: UserRound },
        ].map(({ value, label, icon: Icon }) => (
          <button
            className={`chip ${kind === value ? "active" : ""}`}
            key={value}
            onClick={() => {
              setKind(value);
              setRefresh((v) => v + 1);
            }}
          >
            <span className="row" style={{ gap: 6 }}>
              <Icon size={12} />
              {label}
            </span>
          </button>
        ))}
      </div>
      {kind !== "accounts" && (
        <label
          className="row"
          style={{ marginBottom: 20, color: "#929bb0", fontSize: 11 }}
        >
          <input
            type="checkbox"
            aria-label="Search the founding archive"
            checked={archive}
            onChange={(e) => setArchive(e.target.checked)}
          />
          Search the founding archive
        </label>
      )}
      {!committed && kind === "users" && (
        <div className="explore-grid">
          <Link href="/search?q=coffee&type=posts" className="topic-card">
            <small>COMMON GROUND</small>
            <h3>The daily brew</h3>
            <p>Good coffee. Better conversations.</p>
            <span className="topic-icon">☕</span>
          </Link>
          <Link
            href="/discover?label=A%20little%20curiosity%20goes%20a%20long%20way."
            className="topic-card"
          >
            <small>FOLLOW YOUR CURIOSITY</small>
            <h3>Take a detour</h3>
            <p>Find a new corner of the internet.</p>
            <span className="topic-icon">✦</span>
          </Link>
        </div>
      )}
      <div className="results-heading">
        <span>
          {committed
            ? `Results for “${committed}”`
            : kind === "posts"
              ? "Around the community"
              : "A few people you should meet"}
        </span>
        {committed && (
          <a
            className="text-button"
            href={`/search/preview?term=${encodeURIComponent(committed)}`}
            target="_blank"
            rel="noreferrer"
          >
            Share search{" "}
            <ExternalLink size={10} style={{ display: "inline" }} />
          </a>
        )}
      </div>
      <ErrorNote text={error} />
      {kind === "accounts" && !s.me ? (
        <div className="panel">
          <Empty
            icon={UserRound}
            title="Your community, closer"
            body="Sign in to look up community accounts."
          >
            <Link className="primary-button" href="/login">
              Sign in
            </Link>
          </Empty>
        </div>
      ) : loading ? (
        <Spinner />
      ) : kind === "users" ? (
        data?.users?.length ? (
          data.users.map((u: Any) => <UserResult key={u.id} user={u} {...s} />)
        ) : (
          <div className="panel">
            <Empty
              icon={Search}
              title="No familiar faces just yet"
              body="Try another name or a shorter search."
            />
          </div>
        )
      ) : kind === "posts" ? (
        data?.posts?.length ? (
          data.posts.map((p: Any) => <SearchPost key={p.id} post={p} />)
        ) : (
          <div className="panel">
            <Empty
              icon={Search}
              title="Nothing here yet"
              body="Try another topic. The internet has plenty."
            />
          </div>
        )
      ) : (
        <div className="panel">
          {data?.accounts?.length ? (
            data.accounts.map((a: Any) => (
              <div key={a.id || a.username} className="user-result">
                <Avatar user={a} />
                <div className="person-text">
                  <Link href={`/u/${a.username}`}>
                    <strong>{a.displayName || a.username}</strong>
                  </Link>
                  <p>
                    @{a.username} ·{" "}
                    {a.status || a.premiumStatus || "Community member"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <Empty
              icon={Search}
              title="No accounts found"
              body="Try searching for a username."
            />
          )}
        </div>
      )}
    </>
  );
}
function UserResult({ user, ...s }: Shared & { user: Any }) {
  const [following, setFollowing] = useState(!!user.isFollowing);
  useEffect(() => {
    setFollowing(!!user.isFollowing);
    if (s.me && user.isFollowing === undefined)
      api("/api/users/" + encodeURIComponent(user.username))
        .then((r) => setFollowing(!!r.isFollowing))
        .catch(() => {});
  }, [user.isFollowing, user.username, s.me?.id]);
  const toggle = async () => {
    if (!s.requireUser()) return;
    try {
      const r = await api(`/api/users/${user.id}/follow`, "POST");
      setFollowing(r.following);
      s.notify(
        r.following ? `Following ${display(user)}.` : "Account unfollowed.",
      );
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  return (
    <div className="user-result panel">
      <Link href={`/u/${user.username}`}>
        <Avatar user={user} />
      </Link>
      <Link className="person-text" href={`/u/${user.username}`}>
        <strong>
          {display(user)}
          <Verified user={user} />
        </strong>
        <div className="handle">@{user.username}</div>
        <p>{user.profile?.bio || user.bio}</p>
      </Link>
      {user.id !== s.me?.id && (
        <button
          className={`follow-small ${following ? "following" : ""}`}
          onClick={toggle}
        >
          {following ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}
function SearchPost({ post }: { post: Any }) {
  return (
    <article className="post-card panel" style={{ paddingBottom: 20 }}>
      <header className="post-header">
        <Avatar user={post.author || post} />
        <div className="post-author-info">
          <Link
            href={`/u/${post.author?.username || post.username || "alexm"}`}
            className="post-author"
          >
            {display(post.author || post)}
          </Link>
          <div className="post-time">
            {post.createdAt ? ago(post.createdAt) : "From the community"}
          </div>
        </div>
      </header>
      <p className="post-body">{post.body}</p>
      {post.image && (
        <div className="post-photo">
          <img src={post.image} alt="Community photo" />
        </div>
      )}
      <Link
        href={`/u/${post.author?.username || post.username || "alexm"}#${post.id}`}
        className="text-button"
        style={{ display: "inline-block", marginTop: 15 }}
      >
        View conversation →
      </Link>
    </article>
  );
}

function SignInPrompt({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel">
      <Empty icon={LockKeyhole} title={title} body={body}>
        <Link href="/login" className="primary-button">
          Sign in <ArrowRight size={14} />
        </Link>
      </Empty>
    </div>
  );
}
function MessagesPage({
  conversationId,
  ...s
}: Shared & { conversationId?: string }) {
  const router = useRouter();
  const [refresh, setRefresh] = useState(0);
  const [newMessage, setNewMessage] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, error, loading } = useRemote(
    s.me
      ? conversationId
        ? `/api/messages/${encodeURIComponent(conversationId)}`
        : "/api/conversations"
      : null,
    s.version + refresh,
  );
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (conversationId && data?.conversation) {
      api("/api/conversations/" + encodeURIComponent(conversationId))
        .then(() => s.bump())
        .catch(() => {});
    }
  }, [conversationId, data?.conversation?.id]);
  useEffect(() => {
    if (conversationId && data?.conversation?.id === conversationId) {
      bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [conversationId, data?.conversation?.messages?.length]);
  const conversation = data?.conversation;
  const others = (c: Any) =>
    (c.participants || [])
      .filter((p: Any) => p.userId !== s.me?.id)
      .map((p: Any) => p.user);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !conversationId) return;
    setBusy(true);
    try {
      await api(`/api/conversations/${conversationId}/messages`, "POST", {
        body,
      });
      setBody("");
      setRefresh((v) => v + 1);
      s.notify("Message sent.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="THE CONVERSATIONS THAT COUNT"
        title="Just between us."
      >
        {s.me && (
          <button
            className="secondary-button"
            onClick={() => setNewMessage(true)}
          >
            <Pencil size={13} />
            New message
          </button>
        )}
      </PageTitle>
      {!s.me ? (
        <SignInPrompt
          title="Slide into the conversation"
          body="Your people, one message away. Sign in to catch up."
        />
      ) : (
        <>
          <ErrorNote text={error} />
          {loading && !data ? (
            <Spinner />
          ) : conversationId && conversation ? (
            <div className="messages-layout panel">
              <div className="thread-head">
                <button
                  className="icon-button"
                  onClick={() => router.push("/messages")}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={17} />
                </button>
                <Avatar user={others(conversation)[0]} size="small" />
                <div>
                  <strong>
                    {conversation.title ||
                      others(conversation).map(display).join(", ") ||
                      "Your conversation"}
                  </strong>
                  <small>A little room for the real stuff</small>
                </div>
                <LockKeyhole
                  size={15}
                  color="#7c7590"
                  style={{ marginLeft: "auto" }}
                />
              </div>
              <div className="thread-messages">
                {(conversation.messages || []).length ? (
                  (conversation.messages || []).map((m: Any) => (
                    <div
                      key={m.id}
                      className={`message ${m.senderId === s.me?.id ? "mine" : ""}`}
                    >
                      <Avatar user={m.sender} size="small" />
                      <div>
                        <div className="message-bubble">{m.body}</div>
                        <time>
                          {dateTime(m.createdAt)}{" "}
                          {m.senderId === s.me?.id && m.readAt && (
                            <CheckCheck
                              size={11}
                              style={{
                                display: "inline",
                                verticalAlign: "middle",
                              }}
                            />
                          )}
                        </time>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={MessageCircle}
                    title="A hello goes a long way"
                    body="Say something. It could be the start of a good conversation."
                  />
                )}
                <div ref={bottom} />
              </div>
              <form className="message-form" onSubmit={send}>
                <input
                  aria-label="Write a message"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Say a little something…"
                  maxLength={5000}
                  required
                />
                <button
                  className="primary-button"
                  disabled={busy || !body.trim()}
                  aria-label="Send message"
                >
                  <Send size={17} />
                </button>
              </form>
            </div>
          ) : !conversationId ? (
            <div className="conversation-list panel">
              {data?.conversations?.length ? (
                data.conversations.map((c: Any) => {
                  const people = others(c);
                  const last = c.messages?.[c.messages.length - 1];
                  return (
                    <Link
                      className="conversation-row"
                      key={c.id}
                      href={`/messages/${c.id}`}
                    >
                      <Avatar user={people[0]} />
                      <div className="person-text">
                        <strong>
                          {c.title ||
                            people.map(display).join(", ") ||
                            "Your conversation"}
                        </strong>
                        <p>
                          {last
                            ? `${last.senderId === s.me?.id ? "You: " : ""}${last.body}`
                            : "Start with a hello."}
                        </p>
                      </div>
                      <div className="conversation-meta">
                        <time>{last ? ago(last.createdAt) : ""}</time>
                        {last && last.senderId !== s.me?.id && !last.readAt && (
                          <span className="unread-dot" />
                        )}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <Empty
                  icon={MessageCircle}
                  title="Good conversations start here"
                  body="Send someone a hello. They’re probably thinking the same thing."
                >
                  <button
                    className="primary-button"
                    onClick={() => setNewMessage(true)}
                  >
                    Start a conversation
                  </button>
                </Empty>
              )}
            </div>
          ) : null}
          {newMessage && (
            <NewMessage
              {...s}
              onClose={() => setNewMessage(false)}
              onCreated={(id: string) => {
                setNewMessage(false);
                router.push(`/messages/${id}`);
                setRefresh((v) => v + 1);
              }}
            />
          )}
        </>
      )}
    </>
  );
}
function NewMessage({
  onClose,
  onCreated,
  ...s
}: Shared & { onClose: () => void; onCreated: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const { data } = useRemote(`/api/users?query=${encodeURIComponent(query)}`);
  const [selected, setSelected] = useState<Any | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const r = await api("/api/conversations", "POST", {
        userId: selected.id,
        body: body.trim() || undefined,
      });
      onCreated(r.conversation.id);
      s.notify("Conversation ready.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Start with a hello" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field">
          <span>To</span>
          <input
            aria-label="Find message recipient"
            placeholder="Search for someone…"
            value={selected ? display(selected) : query}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
            }}
          />
        </label>
        {!selected && (
          <div style={{ maxHeight: 230, overflow: "auto", marginBottom: 20 }}>
            {(data?.users || [])
              .filter((u: Any) => u.id !== s.me?.id)
              .slice(0, 8)
              .map((u: Any) => (
                <button
                  className="conversation-row"
                  key={u.id}
                  type="button"
                  onClick={() => setSelected(u)}
                >
                  <Avatar user={u} size="small" />
                  <span className="person-text">
                    <strong>{display(u)}</strong>
                    <p>@{u.username}</p>
                  </span>
                  <Plus size={14} />
                </button>
              ))}
          </div>
        )}
        <label className="field">
          <span>Your first message</span>
          <textarea
            aria-label="First message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Saw your post and had to say…"
            maxLength={5000}
          />
        </label>
        <div className="form-actions">
          <button className="primary-button" disabled={!selected || busy}>
            Start conversation <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PhotosPage({ albumId, ...s }: Shared & { albumId?: string }) {
  return (
    <>
      <PageTitle eyebrow="LIFE, IN LITTLE FRAMES" title="The camera roll.">
        <Camera size={23} color="#ac91e2" />
      </PageTitle>
      <AlbumListing albumId={albumId} {...s} />
    </>
  );
}
function AlbumListing({
  user,
  albumId,
  ...s
}: Shared & { user?: string; albumId?: string }) {
  const [refresh, setRefresh] = useState(0);
  const { data, error, loading } = useRemote(
    `/api/albums${user ? `?user=${encodeURIComponent(user)}` : ""}`,
    s.version + refresh,
  );
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("");
  const [isPrivate, setPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(albumId || "");
  const [preview, setPreview] = useState<Any | null>(null);
  const router = useRouter();
  useEffect(() => {
    setSelected(albumId || "");
  }, [albumId]);
  const albums = data?.albums || [];
  const current = albums.find((a: Any) => a.id === selected);
  const own = current?.userId === s.me?.id;
  const createAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.requireUser()) return;
    setBusy(true);
    try {
      const r = await api("/api/albums", "POST", { name, isPrivate });
      setCreate(false);
      setName("");
      setRefresh((v) => v + 1);
      setSelected(r.album.id);
      s.notify("A new home for your favorite moments.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file?: File) => {
    if (!file || !current) return;
    setBusy(true);
    try {
      const f = new FormData();
      f.append("file", file);
      const r = await api("/api/upload", "POST", f);
      await api(`/api/albums/${current.id}/photos`, "POST", {
        url: r.url,
        caption: file.name.replace(/\.[^.]+$/, ""),
      });
      setRefresh((v) => v + 1);
      s.notify("Another moment, kept.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="results-heading">
        <span>
          {current ? (
            <button
              className="text-button"
              onClick={() => {
                setSelected("");
                if (albumId) router.push("/photos");
              }}
            >
              <ArrowLeft
                size={12}
                style={{ display: "inline", verticalAlign: "middle" }}
              />{" "}
              All albums
            </button>
          ) : user ? (
            "A few moments worth keeping"
          ) : (
            "From the community camera roll"
          )}
        </span>
        {!user || user === s.me?.username ? (
          <button
            className="secondary-button"
            onClick={() => {
              if (s.requireUser()) setCreate(true);
            }}
          >
            <Plus size={12} />
            New album
          </button>
        ) : null}
      </div>
      <ErrorNote text={error} />
      {loading && !data ? (
        <Spinner />
      ) : current ? (
        <>
          <div className="row" style={{ marginBottom: 21 }}>
            <div>
              <h2 className="section-title" style={{ marginBottom: 6 }}>
                {current.name}
              </h2>
              <span className="muted" style={{ fontSize: 11 }}>
                {current.photos?.length || 0} photos ·{" "}
                {current.isPrivate ? "Just for you" : "Out in the world"}
              </span>
            </div>
            <div className="spacer" />
            {own && (
              <label className="secondary-button file-label">
                <Upload size={13} />
                {busy ? "Uploading…" : "Add photo"}
                <input
                  type="file"
                  accept="image/*,.html"
                  aria-label="Upload album photo"
                  disabled={busy}
                  onChange={(e) => upload(e.target.files?.[0])}
                />
              </label>
            )}
          </div>
          {current.photos?.length ? (
            <div className="photo-grid">
              {current.photos.map((p: Any) => (
                <button
                  className="photo-item panel"
                  key={p.id}
                  onClick={() => setPreview(p)}
                >
                  <img
                    src={p.url || `/api/photos/${p.id}`}
                    alt={p.caption || "Album photo"}
                  />
                  {p.caption && <p>{p.caption}</p>}
                </button>
              ))}
            </div>
          ) : (
            <div className="panel">
              <Empty
                icon={Camera}
                title="An empty roll, a world of possibilities"
                body="Add the first photo to your album."
              />
            </div>
          )}
        </>
      ) : albums.length ? (
        <div className="album-grid">
          {albums.map((a: Any) => (
            <button
              className="album-card panel"
              key={a.id}
              onClick={() => setSelected(a.id)}
            >
              <div className="album-cover">
                <img
                  src={
                    a.photos?.[0]?.url ||
                    (a.photos?.[0]?.id && `/api/photos/${a.photos[0].id}`) ||
                    FALLBACK_COVER
                  }
                  alt={a.name}
                />
                {a.isPrivate && (
                  <span className="album-private">
                    <LockKeyhole size={10} />
                    Private
                  </span>
                )}
              </div>
              <div className="album-info" style={{ textAlign: "left" }}>
                <h3>{a.name}</h3>
                <p>
                  {a.photos?.length || 0} photos ·{" "}
                  {a.owner
                    ? display(a.owner)
                    : a.userId === s.me?.id
                      ? "Your album"
                      : "Community album"}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            icon={Images}
            title="Life looks good from here"
            body="Create an album and give your favorite moments a place to live."
          >
            {s.me && (
              <button
                className="primary-button"
                onClick={() => setCreate(true)}
              >
                Create your first album
              </button>
            )}
          </Empty>
        </div>
      )}
      {create && (
        <Modal
          title="Give your moments a home"
          onClose={() => setCreate(false)}
        >
          <form onSubmit={createAlbum}>
            <label className="field">
              <span>Album name</span>
              <input
                aria-label="Album name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The little things, lately"
                maxLength={100}
                required
              />
            </label>
            <div className="setting-row">
              <div>
                <strong>Keep it private</strong>
                <small>Only you can open this album.</small>
              </div>
              <button
                type="button"
                className={`toggle ${isPrivate ? "on" : ""}`}
                aria-label="Private album"
                aria-pressed={isPrivate}
                onClick={() => setPrivate(!isPrivate)}
              />
            </div>
            <div className="form-actions">
              <button className="primary-button" disabled={busy}>
                Create album
              </button>
            </div>
          </form>
        </Modal>
      )}
      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)}>
          <div
            className="modal modal-image"
            role="dialog"
            aria-label="Album photo preview"
          >
            <button
              className="icon-button"
              aria-label="Close photo preview"
              onClick={() => setPreview(null)}
            >
              <X />
            </button>
            <img
              src={preview.url || `/api/photos/${preview.id}`}
              alt={preview.caption || "Album photo"}
            />
          </div>
        </div>
      )}
    </>
  );
}

function NotificationsPage(s: Shared) {
  const [refresh, setRefresh] = useState(0);
  const { data, error, loading } = useRemote(
    s.me ? "/api/notifications" : null,
    s.version + refresh,
  );
  const read = async (id?: string) => {
    try {
      await api("/api/notifications", "PATCH", id ? { id } : {});
      setRefresh((v) => v + 1);
      s.bump();
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE SOMETHING FOR YOU"
        title="You’re in the loop."
      >
        {s.me && (
          <button className="secondary-button" onClick={() => read()}>
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </PageTitle>
      {!s.me ? (
        <SignInPrompt
          title="Never miss the little things"
          body="Sign in for the likes, replies, and familiar hellos."
        />
      ) : (
        <>
          <ErrorNote text={error} />
          {loading && !data ? (
            <Spinner />
          ) : (
            <section className="panel">
              {data?.notifications?.length ? (
                data.notifications.map((n: Any, i: number) => (
                  <div
                    key={n.id}
                    className={`notification-row ${!n.read ? "unread" : ""}`}
                  >
                    <div className="notification-symbol">
                      {n.body?.toLowerCase().includes("like") ? (
                        <Heart size={17} />
                      ) : n.body?.toLowerCase().includes("follow") ? (
                        <Users size={17} />
                      ) : n.body?.toLowerCase().includes("message") ? (
                        <Mail size={17} />
                      ) : (
                        <MessageCircle size={17} />
                      )}
                    </div>
                    <Link
                      className="notification-content"
                      href={n.href || "/"}
                      onClick={() => {
                        if (!n.read) read(n.id);
                      }}
                    >
                      {n.body}
                      <time>{dateTime(n.createdAt)}</time>
                    </Link>
                    {!n.read && (
                      <button
                        className="icon-button"
                        onClick={() => read(n.id)}
                        aria-label="Mark notification read"
                      >
                        <span className="unread-dot" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <Empty
                  icon={Bell}
                  title="All caught up"
                  body="When something happens in your corner, you’ll hear about it here."
                />
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}

function SettingsPage(s: Shared) {
  const [refresh, setRefresh] = useState(0);
  const { data, error, loading } = useRemote(
    s.me ? "/api/settings" : null,
    s.version + refresh,
  );
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [plan, setPlan] = useState("MONTHLY");
  const [order, setOrder] = useState<Any | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [admin, setAdmin] = useState<Any | null>(null);
  const [activity, setActivity] = useState<Any | null>(null);
  const update = async (key: string, value: boolean) => {
    setBusy(true);
    try {
      await api("/api/settings", "PATCH", { [key]: value });
      setRefresh((v) => v + 1);
      await s.reloadMe();
      s.notify("Preference saved.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      await api("/api/verification", "POST", {
        displayName: s.me?.displayName,
      });
      await s.reloadMe();
      s.notify("Verification request submitted. We’ll be in touch.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const startCheckout = async () => {
    setBusy(true);
    try {
      const r = await api("/api/premium/checkout", "POST", { plan });
      setOrder(r.order);
      setCheckout(true);
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const activate = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await api("/api/premium/activate", "POST", {
        orderId: order.id,
        amount: order.price,
      });
      setCheckout(false);
      await s.reloadMe();
      s.notify("A little upgrade, just for you. Premium activated.");
    } catch (e: any) {
      s.notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const showActivity = async () => {
    try {
      const r = await api("/api/account/activity");
      setActivity(r);
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  const showAdmin = async () => {
    try {
      const r = await api("/api/admin/overview");
      setAdmin(r);
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  const settings = data?.settings || s.me?.settings || {};
  return (
    <>
      <PageTitle eyebrow="MAKE IT FEEL LIKE YOU" title="Your little corner.">
        <Settings size={23} color="#ac91e2" />
      </PageTitle>
      {!s.me ? (
        <SignInPrompt
          title="Make yourself at home"
          body="Sign in to manage your profile and preferences."
        />
      ) : (
        <>
          <ErrorNote text={error} />
          <section className="settings-card panel">
            <div className="row">
              <Avatar user={s.me} />
              <div>
                <h2 style={{ marginBottom: 5 }}>{display(s.me)}</h2>
                <span style={{ fontSize: 11, color: "#858da4" }}>
                  @{s.me.username}
                </span>
              </div>
              <div className="spacer" />
              <button
                className="secondary-button"
                onClick={() => setEdit(true)}
              >
                <Pencil size={12} />
                Edit profile
              </button>
            </div>
          </section>
          <section className="settings-card panel">
            <h2>Keep your circle comfortable.</h2>
            <p className="settings-description">
              A few small choices about what you share, and who you share it
              with.
            </p>
            {[
              {
                key: "privateAccount",
                title: "Private account",
                body: "Keep your posts for your own circle.",
              },
              {
                key: "showActivity",
                title: "Show activity status",
                body: "Let your people know when you’re around.",
              },
              {
                key: "allowMessages",
                title: "Allow new messages",
                body: "Give new conversations a place to start.",
              },
            ].map((item) => (
              <div className="setting-row" key={item.key}>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.body}</small>
                </div>
                <button
                  className={`toggle ${settings[item.key] ? "on" : ""}`}
                  disabled={busy}
                  aria-label={item.title}
                  aria-pressed={!!settings[item.key]}
                  onClick={() => update(item.key, !settings[item.key])}
                />
              </div>
            ))}
          </section>
          <section className="premium-card panel" id="premium">
            <div className="premium-heading">
              <span className="badge">
                <Crown size={12} />
                PENETRATE.ME PREMIUM
              </span>
              <span className="balance-pill">
                {Number(s.me.premium?.credits || 0).toLocaleString()} virtual
                credits
              </span>
            </div>
            <h2>A little extra main character energy.</h2>
            <p>
              Give your profile a glow-up, stand out in the conversation, and
              make this corner of the internet your own.
            </p>
            <div className="premium-perks">
              <span>
                <Check size={11} />
                Profile badge
              </span>
              <span>
                <Check size={11} />
                Extra personality
              </span>
              <span>
                <Check size={11} />
                Simulated credits only
              </span>
            </div>
            {s.me.premium?.status &&
            s.me.premium.status !== "NONE" &&
            s.me.premium.status !== "STANDARD" &&
            s.me.premium.status !== "FREE" ? (
              <div className="notice" style={{ marginBottom: 0 }}>
                <Crown
                  size={14}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 6,
                  }}
                />
                You’re enjoying {s.me.premium.status.toLowerCase()} Premium.
                Looking good.
              </div>
            ) : (
              <div className="premium-actions">
                <select
                  aria-label="Premium plan"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  style={{ width: "auto", fontSize: 11 }}
                >
                  <option value="MONTHLY">Monthly · 25 virtual credits</option>
                  <option value="LIFETIME">
                    Lifetime · 1,000 virtual credits
                  </option>
                </select>
                <button
                  className="primary-button"
                  onClick={startCheckout}
                  disabled={busy}
                >
                  Get a little extra <ArrowRight size={13} />
                </button>
              </div>
            )}
          </section>
          <section className="settings-card panel mt">
            <h2>A familiar face. Officially.</h2>
            <p className="settings-description">
              Request a profile check so your friends know it’s you.
            </p>
            <div className="setting-row">
              <div>
                <strong>
                  {verified(s.me)
                    ? "You’re verified. Nice to meet you."
                    : s.me.verification?.state === "PENDING"
                      ? "Your request is in the queue."
                      : "Let’s make it official."}
                </strong>
                <small>
                  {verified(s.me)
                    ? "Your verification badge is visible on your profile."
                    : "Our community team will review your profile."}
                </small>
              </div>
              {verified(s.me) ? (
                <BadgeCheck size={26} color="#a98cff" />
              ) : (
                <button
                  className="secondary-button"
                  disabled={busy || s.me.verification?.state === "PENDING"}
                  onClick={verify}
                >
                  {s.me.verification?.state === "PENDING"
                    ? "Pending review"
                    : "Request verification"}
                </button>
              )}
            </div>
          </section>
          <section className="settings-card panel">
            <h2>Account details</h2>
            <p className="settings-description">
              The basics behind your corner of the internet.
            </p>
            <div className="setting-row">
              <div>
                <strong>Email address</strong>
                <small>{s.me.email}</small>
              </div>
              <Mail size={16} color="#85809d" />
            </div>
            <div className="setting-row">
              <div>
                <strong>Password</strong>
                <small>Ready for a fresh start?</small>
              </div>
              <Link className="secondary-button" href="/reset">
                Reset password
              </Link>
            </div>
            <div className="setting-row">
              <div>
                <strong>Your account activity</strong>
                <small>A look at your recent sign-ins.</small>
              </div>
              <button className="secondary-button" onClick={showActivity}>
                View activity
              </button>
            </div>
            <div className="setting-row">
              <div>
                <strong>A copy of your corner</strong>
                <small>Download your fictional account details.</small>
              </div>
              <a
                className="secondary-button"
                href={
                  "/api/account/export?userId=" + encodeURIComponent(s.me.id)
                }
                download="my-penetrate-account.json"
              >
                Export my data
              </a>
            </div>
            {s.me.role === "ADMIN" && (
              <div className="setting-row">
                <div>
                  <strong>Community administration</strong>
                  <small>Read the community’s operational overview.</small>
                </div>
                <button className="secondary-button" onClick={showAdmin}>
                  View overview
                </button>
              </div>
            )}
          </section>
          {edit && (
            <EditProfile
              user={s.me}
              onClose={() => setEdit(false)}
              onSaved={async () => {
                setEdit(false);
                await s.reloadMe();
              }}
              {...s}
            />
          )}
          <BlockedAccounts {...s} />
          {checkout && (
            <Modal
              title="Your next chapter looks good"
              onClose={() => setCheckout(false)}
            >
              <div className="notice">
                This is a simulated subscription using fictional virtual
                credits.
              </div>
              <div className="setting-row">
                <strong>
                  {plan === "MONTHLY" ? "Monthly" : "Lifetime"} Premium
                </strong>
                <span>
                  {Number(order?.price || 0).toLocaleString()} credits
                </span>
              </div>
              <p className="settings-description mt">
                Your account has{" "}
                {Number(s.me.premium?.credits || 0).toLocaleString()} virtual
                credits. No payment information needed.
              </p>
              <div className="form-actions">
                <button
                  className="secondary-button"
                  onClick={() => setCheckout(false)}
                >
                  Maybe later
                </button>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={activate}
                >
                  Activate Premium
                </button>
              </div>
            </Modal>
          )}
          {activity && (
            <Modal
              title="Your account activity"
              onClose={() => setActivity(null)}
            >
              {(activity.activity || []).map((a: Any, i: number) => (
                <div className="admin-note panel" key={i}>
                  <strong>{a.label}</strong>
                  <p className="muted">{dateTime(a.time)}</p>
                </div>
              ))}
            </Modal>
          )}
          {admin && (
            <Modal title="Community overview" onClose={() => setAdmin(null)}>
              {Object.entries(admin).map(([key, value]) => (
                <div className="admin-note panel" key={key}>
                  <strong
                    style={{ display: "block", textTransform: "capitalize" }}
                  >
                    {key.replace(/([A-Z])/g, " $1")}
                  </strong>
                  {typeof value === "object" ? (
                    <pre
                      style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                    >
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    String(value)
                  )}
                </div>
              ))}
            </Modal>
          )}
        </>
      )}
    </>
  );
}
function BlockedAccounts(s: Shared) {
  const { data } = useRemote("/api/settings", s.version);
  const blocked = data?.blockedUsers || data?.settings?.blockedUsers || [];
  const unblock = async (u: Any) => {
    try {
      await api(`/api/users/${u.id || u.blockedId}/block`, "POST");
      s.bump();
      s.notify("Account unblocked.");
    } catch (e: any) {
      s.notify(e.message, true);
    }
  };
  return blocked.length ? (
    <section className="settings-card panel">
      <h2>A little breathing room</h2>
      <p className="settings-description">
        You decide who gets a place in your circle.
      </p>
      {blocked.map((b: Any) => {
        const u = b.blocked || b.user || b;
        return (
          <div className="blocked-user" key={u.id || b.blockedId}>
            <Avatar user={u} size="small" />
            <span className="person-text">{display(u)}</span>
            <button className="secondary-button" onClick={() => unblock(u)}>
              Unblock
            </button>
          </div>
        );
      })}
    </section>
  ) : null;
}

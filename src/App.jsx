import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  Edit3,
  LogOut,
  Mail,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import { themeList, themes, themeStorageKey } from "./themes";
import { userConfig } from "./userConfig";

const TASK_CACHE_PREFIX = "her-todo-task-cache";
const LOCAL_TASKS_KEY = "her-todo-local-tasks";
const WELCOME_STORAGE_KEY = "her-todo-welcome-seen";
const BACKUP_APP_NAME = "静茹的 Her Todo";

const categories = ["学习", "生活", "护肤", "运动", "约会", "心情", "其他"];
const priorities = ["高", "中", "低"];

const emptyForm = {
  title: "",
  category: "学习",
  priority: "中",
  dueDate: new Date().toISOString().slice(0, 10),
};

function isToday(dateString) {
  const today = new Date().toISOString().slice(0, 10);
  return dateString === today;
}

function getCompletedMessage(taskId, messages) {
  const messageIndex =
    [...taskId].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) %
    messages.length;
  return messages[messageIndex];
}

function getPriorityCode(priority) {
  if (priority === "高") {
    return "P1";
  }

  if (priority === "中") {
    return "P2";
  }

  return "P3";
}

function isAllowedEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  return userConfig.allowedEmails
    .filter((allowedEmail) => !allowedEmail.includes("请"))
    .map((allowedEmail) => allowedEmail.trim().toLowerCase())
    .includes(normalizedEmail);
}

function getAllowedEmails() {
  return userConfig.allowedEmails.filter((allowedEmail) => {
    return allowedEmail.trim() && !allowedEmail.includes("请");
  });
}

function createTaskId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeImportedTask(task) {
  return {
    id: task.id || createTaskId(),
    title: String(task.title || "").trim(),
    category: categories.includes(task.category) ? task.category : "其他",
    priority: priorities.includes(task.priority) ? task.priority : "中",
    dueDate:
      task.dueDate || task.due_date || new Date().toISOString().slice(0, 10),
    completed: Boolean(task.completed),
    createdAt: task.createdAt || task.created_at || new Date().toISOString(),
  };
}

function mapRowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category || "其他",
    priority: row.priority || "中",
    dueDate: row.due_date || new Date().toISOString().slice(0, 10),
    completed: Boolean(row.completed),
    createdAt: row.created_at,
  };
}

function mapTaskToRow(task, userId) {
  return {
    user_id: userId,
    title: task.title,
    category: task.category,
    priority: task.priority,
    due_date: task.dueDate,
    completed: task.completed,
  };
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("today");
  const [techTip, setTechTip] = useState("");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [loginEmail, setLoginEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const importFileRef = useRef(null);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === "true";
  });
  const [themeId, setThemeId] = useState(() => {
    const savedTheme = localStorage.getItem(themeStorageKey);
    if (savedTheme === "tech") {
      return "obsidian";
    }

    return themes[savedTheme] ? savedTheme : "obsidian";
  });

  const currentTheme = themes[themeId] || themes.obsidian;
  const isObsidian = currentTheme.id === "obsidian";
  const isCloudMode = isSupabaseConfigured;
  const allowedEmails = getAllowedEmails();
  const hasAllowedEmails = allowedEmails.length > 0;
  const user = session?.user;
  const userEmail = user?.email || "";
  const cacheKey = isCloudMode && user ? `${TASK_CACHE_PREFIX}-${user.id}` : LOCAL_TASKS_KEY;
  const canUseTodo = !isCloudMode || Boolean(user && isAllowedEmail(userEmail));

  useEffect(() => {
    localStorage.setItem(themeStorageKey, themeId);
  }, [themeId]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isCloudMode) {
      const savedTasks = localStorage.getItem(LOCAL_TASKS_KEY);
      if (savedTasks) {
        try {
          setTasks(JSON.parse(savedTasks));
        } catch {
          setTasks([]);
        }
      }
      setSyncStatus("local");
      setSyncMessage("当前为本地保存模式，任务会保存在当前设备。");
      return;
    }

    if (!canUseTodo || !cacheKey) {
      setTasks([]);
      return;
    }

    loadTasks();
  }, [canUseTodo, cacheKey, isCloudMode]);

  const todayTasks = useMemo(
    () => tasks.filter((task) => isToday(task.dueDate)),
    [tasks]
  );

  const completedTodayCount = todayTasks.filter((task) => task.completed).length;
  const todayCompletionRate =
    todayTasks.length === 0
      ? 0
      : Math.round((completedTodayCount / todayTasks.length) * 100);
  const progressBlocks = Math.round(todayCompletionRate / 10);
  const cliProgress = `${"=".repeat(progressBlocks)}${" ".repeat(
    10 - progressBlocks
  )}`;

  const filteredTasks = useMemo(() => {
    if (activeFilter === "today") {
      return todayTasks;
    }

    if (activeFilter === "completed") {
      return tasks.filter((task) => task.completed);
    }

    if (activeFilter === "active") {
      return tasks.filter((task) => !task.completed);
    }

    return tasks;
  }, [activeFilter, tasks, todayTasks]);

  async function loadTasks() {
    if (!user || !cacheKey) return;

    setSyncStatus("loading");
    setSyncMessage("正在同步静茹的小任务...");

    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      const cachedTasks = localStorage.getItem(cacheKey);
      if (cachedTasks) {
        setTasks(JSON.parse(cachedTasks));
        setSyncStatus("cached");
        setSyncMessage("当前显示的是本地缓存，网络恢复后请刷新同步。");
      } else {
        setSyncStatus("error");
        setSyncMessage("同步失败，可以稍后再试。");
      }
      return;
    }

    const loadedTasks = data.map(mapRowToTask);
    setTasks(loadedTasks);
    localStorage.setItem(cacheKey, JSON.stringify(loadedTasks));
    setSyncStatus("ready");
    setSyncMessage("");
  }

  function updateTaskCache(nextTasks) {
    if (cacheKey) {
      localStorage.setItem(cacheKey, JSON.stringify(nextTasks));
    }
  }

  function saveLocalTasks(nextTasks) {
    setTasks(nextTasks);
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(nextTasks));
    setSyncStatus("local");
    setSyncMessage("当前为本地保存模式，任务会保存在当前设备。");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthMessage("");
    setAuthError("");

    const email = loginEmail.trim();
    if (!email) {
      setAuthError("请先输入邮箱。");
      return;
    }

    if (!hasAllowedEmails) {
      setAuthError("请先在 src/userConfig.js 里填写允许登录的邮箱。");
      return;
    }

    if (!isAllowedEmail(email)) {
      setAuthError("这个小 Todo 只开放给静茹使用。");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthError("登录链接发送失败，请检查邮箱或 Supabase 配置。");
      return;
    }

    setAuthMessage("登录链接已发送，请去邮箱里点击链接。");
  }

  async function handleSignOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
    setSession(null);
    setTasks([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isCloudMode && !user) return;

    const title = form.title.trim();
    if (!title) {
      return;
    }

    if (!isCloudMode) {
      if (editingId) {
        const nextTasks = tasks.map((task) =>
          task.id === editingId
            ? {
                ...task,
                title,
                category: form.category,
                priority: form.priority,
                dueDate: form.dueDate,
              }
            : task
        );
        saveLocalTasks(nextTasks);
        setEditingId(null);
        setTechTip("任务已更新，继续按自己的节奏来。");
      } else {
        const newTask = {
          id: createTaskId(),
          title,
          category: form.category,
          priority: form.priority,
          dueDate: form.dueDate,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        saveLocalTasks([newTask, ...tasks]);
        setTechTip("任务已添加，慢慢完成就好。");
      }

      setForm(emptyForm);
      return;
    }

    if (editingId) {
      const { data, error } = await supabase
        .from("todos")
        .update({
          title,
          category: form.category,
          priority: form.priority,
          due_date: form.dueDate,
        })
        .eq("id", editingId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        setSyncStatus("error");
        setSyncMessage("同步失败，可以稍后再试。");
        return;
      }

      const updatedTask = mapRowToTask(data);
      setTasks((currentTasks) => {
        const nextTasks = currentTasks.map((task) =>
          task.id === editingId ? updatedTask : task
        );
        updateTaskCache(nextTasks);
        return nextTasks;
      });
      setEditingId(null);
      setTechTip("任务已更新，继续按自己的节奏来。");
    } else {
      const newTask = {
        title,
        category: form.category,
        priority: form.priority,
        dueDate: form.dueDate,
        completed: false,
      };

      const { data, error } = await supabase
        .from("todos")
        .insert(mapTaskToRow(newTask, user.id))
        .select()
        .single();

      if (error) {
        setSyncStatus("error");
        setSyncMessage("同步失败，可以稍后再试。");
        return;
      }

      const createdTask = mapRowToTask(data);
      setTasks((currentTasks) => {
        const nextTasks = [createdTask, ...currentTasks];
        updateTaskCache(nextTasks);
        return nextTasks;
      });
      setTechTip("任务已添加，慢慢完成就好。");
    }

    setForm(emptyForm);
    setSyncStatus("ready");
    setSyncMessage("");
  }

  function startEditing(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      category: task.category,
      priority: task.priority,
      dueDate: task.dueDate,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function toggleTask(taskId) {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask || (isCloudMode && !user)) return;

    if (!isCloudMode) {
      const nextTasks = tasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: !currentTask.completed }
          : task
      );
      saveLocalTasks(nextTasks);

      if (!currentTask.completed) {
        setTechTip("完成啦，今天也很厉害。");
      }
      return;
    }

    const { data, error } = await supabase
      .from("todos")
      .update({ completed: !currentTask.completed })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      setSyncStatus("error");
      setSyncMessage("同步失败，可以稍后再试。");
      return;
    }

    const updatedTask = mapRowToTask(data);
    setTasks((currentTasks) => {
      const nextTasks = currentTasks.map((task) =>
        task.id === taskId ? updatedTask : task
      );
      updateTaskCache(nextTasks);
      return nextTasks;
    });

    if (!currentTask.completed) {
      setTechTip("完成啦，今天也很厉害。");
    }
  }

  async function deleteTask(taskId) {
    if (isCloudMode && !user) return;

    if (!isCloudMode) {
      const nextTasks = tasks.filter((task) => task.id !== taskId);
      saveLocalTasks(nextTasks);

      if (editingId === taskId) {
        cancelEditing();
      }
      return;
    }

    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      setSyncStatus("error");
      setSyncMessage("同步失败，可以稍后再试。");
      return;
    }

    setTasks((currentTasks) => {
      const nextTasks = currentTasks.filter((task) => task.id !== taskId);
      updateTaskCache(nextTasks);
      return nextTasks;
    });

    if (editingId === taskId) {
      cancelEditing();
    }
  }

  function handleImageError(event) {
    event.currentTarget.style.display = "none";
    event.currentTarget
      .closest(".theme-photo-card")
      ?.classList.add("photo-fallback");
  }

  function startApp() {
    localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    setHasSeenWelcome(true);
  }

  function exportBackup() {
    const backup = {
      appName: BACKUP_APP_NAME,
      exportedAt: new Date().toISOString(),
      theme: themeId,
      tasks,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `her-todo-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setTechTip("备份已导出");
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const content = await file.text();
      const backup = JSON.parse(content);
      if (!Array.isArray(backup.tasks)) {
        throw new Error("Invalid backup");
      }

      const shouldImport = window.confirm(
        "导入备份会把备份里的任务加入当前清单，确定继续吗？"
      );
      if (!shouldImport) return;

      const importedTasks = backup.tasks
        .map(normalizeImportedTask)
        .filter((task) => task.title);

      if (backup.theme && themes[backup.theme]) {
        setThemeId(backup.theme);
      }

      if (!isCloudMode) {
        saveLocalTasks([...importedTasks, ...tasks]);
        setTechTip("导入完成");
        return;
      }

      if (!user) return;

      const { error } = await supabase.from("todos").insert(
        importedTasks.map((task) => mapTaskToRow(task, user.id))
      );

      if (error) {
        setSyncStatus("error");
        setSyncMessage("导入失败，请检查文件格式");
        return;
      }

      setTechTip("导入完成");
      await loadTasks();
    } catch {
      setSyncStatus("error");
      setSyncMessage("导入失败，请检查文件格式");
    }
  }

  function getEmptyMessage() {
    if (activeFilter === "completed") {
      return "还没有已完成任务";
    }

    if (activeFilter === "active") {
      return "没有未完成任务";
    }

    return currentTheme.emptyTitle;
  }

  function renderStatusMessage() {
    if (!syncMessage) return null;

    return <div className={`sync-message ${syncStatus}`}>{syncMessage}</div>;
  }

  function renderAuthPage() {
    const emailAllowed = userEmail ? isAllowedEmail(userEmail) : true;

    return (
      <main className={`app ${currentTheme.className}`}>
        <section className="auth-screen">
          <form className="auth-card" onSubmit={handleLogin}>
            <p className="welcome-kicker">Private Todo</p>
            <h1>给{userConfig.displayName}的 Her Todo</h1>
            <p>
              这是一个只给你用的小任务清单。
              <br />
              登录后就可以继续记录每天的小事。
            </p>

            {!emailAllowed ? (
              <div className="auth-error">这个小 Todo 只开放给静茹使用。</div>
            ) : !hasAllowedEmails ? (
              <div className="auth-error">
                请先在 src/userConfig.js 里填写允许登录的邮箱。
              </div>
            ) : (
              <>
                <label>
                  邮箱
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="输入允许使用的邮箱"
                  />
                </label>
                <button className="primary-button" type="submit">
                  <Mail size={18} />
                  发送登录链接
                </button>
              </>
            )}

            {authMessage && <div className="auth-message">{authMessage}</div>}
            {authError && <div className="auth-error">{authError}</div>}

            {session && (
              <button
                className="secondary-button"
                type="button"
                onClick={handleSignOut}
              >
                退出当前账号
              </button>
            )}
          </form>
        </section>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className={`app ${currentTheme.className}`}>
        <section className="auth-screen">
          <div className="auth-card">
            <p>正在检查登录状态...</p>
          </div>
        </section>
      </main>
    );
  }

  if (isCloudMode && (!session || !canUseTodo)) {
    return renderAuthPage();
  }

  return (
    <main className={`app ${currentTheme.className}`}>
      <div className="theme-decorations" aria-hidden="true">
        <span className="decor decor-cloud" />
        <span className="decor decor-star one" />
        <span className="decor decor-star two" />
        <span className="decor decor-heart" />
        <span className="decor decor-drop" />
      </div>

      {!hasSeenWelcome ? (
        <section className="welcome-screen">
          <div className="welcome-card">
            <p className="welcome-kicker">Her Todo</p>
            <h1>给{userConfig.displayName}的 Her Todo</h1>
            <p>
              这是一个专门给你做的小 Todo。
              <br />
              不用一次完成很多，慢慢来就好。
              <br />
              希望它能陪你把每天的小事一点点完成。
            </p>
            <button
              className="primary-button welcome-button"
              type="button"
              onClick={startApp}
            >
              开始使用
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">{currentTheme.group}</p>
              <h1>{currentTheme.title}</h1>
              <h2>{currentTheme.subtitle}</h2>
              <p className="hero-text">{currentTheme.description}</p>

              {isObsidian && (
                <div
                  className="tech-code-window"
                  aria-label="Obsidian Code 状态代码"
                >
                  <div className="window-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <pre>
                    <code>
                      <span className="code-keyword">const</span>{" "}
                      <span className="code-function">今日状态</span>{" "}
                      <span className="code-operator">=</span>{" "}
                      <span className="code-string">"专注一点点"</span>;
                      {"\n"}
                      <span className="code-keyword">const</span>{" "}
                      <span className="code-function">今日目标</span>{" "}
                      <span className="code-operator">=</span>{" "}
                      <span className="code-string">"完成小事，也很棒"</span>;
                    </code>
                  </pre>
                </div>
              )}
            </div>

            {currentTheme.image && (
              <div className="theme-photo-card" aria-hidden="true">
                {currentTheme.image.length > 1 ? (
                  <>
                    <img
                      className="theme-photo main"
                      src={currentTheme.image[0]}
                      alt=""
                      onError={handleImageError}
                    />
                    <img
                      className="theme-photo second"
                      src={currentTheme.image[1]}
                      alt=""
                      onError={handleImageError}
                    />
                  </>
                ) : (
                  <img
                    className="theme-photo main"
                    src={currentTheme.image[0]}
                    alt=""
                    onError={handleImageError}
                  />
                )}
              </div>
            )}

            <div className="hero-side">
              <div className="account-pill">
                <span>{isCloudMode ? userEmail : "本地保存模式"}</span>
                {isCloudMode && (
                  <button type="button" onClick={handleSignOut}>
                    <LogOut size={15} />
                    退出
                  </button>
                )}
              </div>

              <label className="theme-picker">
                <span>主题选择</span>
                <select
                  value={themeId}
                  onChange={(event) => setThemeId(event.target.value)}
                  aria-label="主题选择"
                >
                  {themeList.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.group} · {theme.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="today-card" aria-label="今日完成率">
                {isObsidian ? (
                  <>
                    <span>今日完成率</span>
                    <small>
                      已完成：
                      <strong className="inline-metric">
                        {completedTodayCount}
                      </strong>
                    </small>
                    <small>
                      总任务：
                      <strong className="inline-metric">
                        {todayTasks.length}
                      </strong>
                    </small>
                    <small>
                      完成率：
                      <strong className="inline-metric">
                        {todayCompletionRate}%
                      </strong>
                    </small>
                    <small className="status-label">status.progress</small>
                    <code className="cli-progress">
                      [{cliProgress}] {todayCompletionRate}%
                    </code>
                  </>
                ) : (
                  <>
                    <span>今日完成率</span>
                    <strong>{todayCompletionRate}%</strong>
                    <small>
                      {completedTodayCount} / {todayTasks.length} 已完成
                    </small>
                  </>
                )}
              </div>

              <div className="backup-actions" aria-label="备份与恢复">
                <button className="secondary-button" type="button" onClick={exportBackup}>
                  <Download size={16} />
                  导出备份
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                >
                  <Upload size={16} />
                  导入备份
                </button>
                <input
                  ref={importFileRef}
                  className="backup-input"
                  type="file"
                  accept="application/json,.json"
                  onChange={importBackup}
                />
              </div>
            </div>
          </section>

          {renderStatusMessage()}

          <section className="workspace">
            <div className="left-column">
              <form className="task-form" onSubmit={handleSubmit}>
                <div className="form-title">
                  <ClipboardList size={20} />
                  <h2>{editingId ? "编辑任务" : "添加任务"}</h2>
                </div>
                {isObsidian && (
                  <p className="form-code-hint">task.create()</p>
                )}

                <label>
                  {isObsidian ? (
                    <span className="label-row">
                      任务名称 <code>title</code>
                    </span>
                  ) : (
                    "任务名称"
                  )}
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleInputChange}
                    placeholder={
                      isObsidian
                        ? "写下今天想完成的小事"
                        : "例如：做完今天的小目标"
                    }
                  />
                </label>

                <div className="form-grid">
                  <label>
                    {isObsidian ? (
                      <span className="label-row">
                        分类 <code>category</code>
                      </span>
                    ) : (
                      "分类"
                    )}
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleInputChange}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {isObsidian ? (
                      <span className="label-row">
                        优先级 <code>priority</code>
                      </span>
                    ) : (
                      "优先级"
                    )}
                    <select
                      name="priority"
                      value={form.priority}
                      onChange={handleInputChange}
                    >
                      {priorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {isObsidian ? (
                      <span className="label-row">
                        截止日期 <code>dueDate</code>
                      </span>
                    ) : (
                      "截止日期"
                    )}
                    <input
                      type="date"
                      name="dueDate"
                      value={form.dueDate}
                      onChange={handleInputChange}
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button className="primary-button" type="submit">
                    {editingId ? <Check size={18} /> : <Plus size={18} />}
                    {editingId ? "保存修改" : "添加任务"}
                  </button>

                  {editingId && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={cancelEditing}
                    >
                      <X size={18} />
                      取消
                    </button>
                  )}
                </div>
                {isObsidian && (
                  <p className={`tech-action-tip ${techTip ? "show" : ""}`}>
                    {techTip || "任务会保存在今天的清单里。"}
                  </p>
                )}
              </form>

              <aside className="daily-note">
                {currentTheme.id === "lulu" && (
                  <div className="capybara" aria-label="噜噜水豚头像">
                    <span className="capybara-ear left" />
                    <span className="capybara-ear right" />
                    <span className="capybara-eye left" />
                    <span className="capybara-eye right" />
                    <span className="capybara-nose" />
                  </div>
                )}
                <div className="note-icon">
                  <Sparkles size={18} />
                </div>
                <p>今日小纸条</p>
                <strong>
                  {isObsidian ? (
                    <>
                      <span className="log-info">[INFO]</span>{" "}
                      {currentTheme.note}
                    </>
                  ) : (
                    currentTheme.note
                  )}
                </strong>
              </aside>
            </div>

            <section className="task-panel">
              <div className="filter-tabs" aria-label="任务筛选">
                <button
                  className={activeFilter === "today" ? "active" : ""}
                  onClick={() => setActiveFilter("today")}
                  type="button"
                >
                  今日任务
                </button>
                <button
                  className={activeFilter === "all" ? "active" : ""}
                  onClick={() => setActiveFilter("all")}
                  type="button"
                >
                  全部任务
                </button>
                <button
                  className={activeFilter === "active" ? "active" : ""}
                  onClick={() => setActiveFilter("active")}
                  type="button"
                >
                  未完成
                </button>
                <button
                  className={activeFilter === "completed" ? "active" : ""}
                  onClick={() => setActiveFilter("completed")}
                  type="button"
                >
                  已完成
                </button>
              </div>

              <div className="task-list">
                {syncStatus === "loading" ? (
                  <div className="empty-state">
                    <p>正在同步静茹的小任务...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="empty-state">
                    {isObsidian ? (
                      <div className="terminal-empty">
                        <strong>{currentTheme.emptyTitle}</strong>
                        <span>{currentTheme.emptyDescription}</span>
                        <code>status: empty</code>
                      </div>
                    ) : (
                      <>
                        <CalendarDays size={36} />
                        <p>{getEmptyMessage()}</p>
                        {currentTheme.emptyDescription && (
                          <small>{currentTheme.emptyDescription}</small>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <article
                      className={`task-card ${
                        task.completed ? "completed" : ""
                      } ${task.priority === "高" ? "high-priority" : ""}`}
                      key={task.id}
                    >
                      <button
                        className={`check-button ${
                          task.completed ? "checked" : ""
                        }`}
                        onClick={() => toggleTask(task.id)}
                        aria-label={
                          task.completed ? "标记为未完成" : "标记为完成"
                        }
                        title={task.completed ? "标记为未完成" : "标记为完成"}
                        type="button"
                      >
                        {task.completed && <Check size={16} />}
                      </button>

                      <div className="task-content">
                        {isObsidian ? (
                          <div className="task-code-block">
                            <div className="task-code-line">
                              <span className="code-muted">{"{"}</span>
                            </div>
                            <div className="task-code-line">
                              <span className="code-property">title</span>
                              <span className="code-operator">:</span>{" "}
                              <span className="code-string">
                                "{task.title}"
                              </span>
                              <span className="code-muted">,</span>
                            </div>
                            <div className="task-code-line">
                              <span className="code-property">category</span>
                              <span className="code-operator">:</span>{" "}
                              <span className="code-string">
                                "{task.category}"
                              </span>
                              <span className="code-muted">,</span>
                            </div>
                            <div className="task-code-line">
                              <span className="code-property">priority</span>
                              <span className="code-operator">:</span>{" "}
                              <span
                                className={`priority priority-${task.priority}`}
                              >
                                [{getPriorityCode(task.priority)}]
                              </span>
                              <span className="code-muted">,</span>
                            </div>
                            <div className="task-code-line">
                              <span className="code-property">due</span>
                              <span className="code-operator">:</span>{" "}
                              <span className="code-number">
                                "{task.dueDate}"
                              </span>
                              <span className="code-muted">,</span>
                            </div>
                            <div className="task-code-line">
                              <span className="code-property">status</span>
                              <span className="code-operator">:</span>{" "}
                              <span
                                className={
                                  task.completed
                                    ? "code-success"
                                    : "code-warning"
                                }
                              >
                                "{task.completed ? "done" : "open"}"
                              </span>
                            </div>
                            <div className="task-code-line">
                              <span className="code-muted">{"}"}</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="task-header">
                              <h3>{task.title}</h3>
                              <span
                                className={`priority priority-${task.priority}`}
                              >
                                {task.priority}优先级
                              </span>
                            </div>

                            <div className="task-meta">
                              <span>{task.category}</span>
                              <span>{task.dueDate}</span>
                              <span>{task.completed ? "已完成" : "未完成"}</span>
                            </div>
                          </>
                        )}

                        {task.completed && (
                          <p className="complete-message">
                            {getCompletedMessage(
                              task.id,
                              currentTheme.completedMessages
                            )}
                          </p>
                        )}
                      </div>

                      <div className="card-actions">
                        <button
                          className="icon-button"
                          onClick={() => startEditing(task)}
                          aria-label="编辑任务"
                          title="编辑任务"
                          type="button"
                        >
                          <Edit3 size={17} />
                        </button>
                        <button
                          className="icon-button danger"
                          onClick={() => deleteTask(task.id)}
                          aria-label="删除任务"
                          title="删除任务"
                          type="button"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>
        </>
      )}
    </main>
  );
}

export default App;

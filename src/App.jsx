import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Edit3,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { themeList, themes, themeStorageKey } from "./themes";
import { userConfig } from "./userConfig";

const STORAGE_KEY = "college-todo-list";
const WELCOME_STORAGE_KEY = "her-todo-welcome-seen";

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

function App() {
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    return savedTasks ? JSON.parse(savedTasks) : [];
  });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("today");
  const [techTip, setTechTip] = useState("");
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(themeStorageKey, themeId);
  }, [themeId]);

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

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) {
      return;
    }

    if (editingId) {
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingId ? { ...task, ...form, title } : task
        )
      );
      setEditingId(null);
      setTechTip("任务已更新，继续按自己的节奏来。");
    } else {
      const newTask = {
        id: crypto.randomUUID(),
        title,
        category: form.category,
        priority: form.priority,
        dueDate: form.dueDate,
        completed: false,
        createdAt: new Date().toISOString(),
      };

      setTasks((currentTasks) => [newTask, ...currentTasks]);
      setTechTip("任务已添加，慢慢完成就好。");
    }

    setForm(emptyForm);
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

  function toggleTask(taskId) {
    const currentTask = tasks.find((task) => task.id === taskId);
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );

    if (currentTask && !currentTask.completed) {
      setTechTip("完成啦，今天也很厉害。");
    }
  }

  function deleteTask(taskId) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId)
    );

    if (editingId === taskId) {
      cancelEditing();
    }
  }

  function handleImageError(event) {
    event.currentTarget.style.display = "none";
    event.currentTarget.closest(".theme-photo-card")?.classList.add("photo-fallback");
  }

  function startApp() {
    localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    setHasSeenWelcome(true);
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
            <button className="primary-button welcome-button" type="button" onClick={startApp}>
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
            <div className="tech-code-window" aria-label="Obsidian Code 状态代码">
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
                  <strong className="inline-metric">{completedTodayCount}</strong>
                </small>
                <small>
                  总任务：
                  <strong className="inline-metric">{todayTasks.length}</strong>
                </small>
                <small>
                  完成率：
                  <strong className="inline-metric">{todayCompletionRate}%</strong>
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
        </div>
      </section>

      <section className="workspace">
        <div className="left-column">
          <form className="task-form" onSubmit={handleSubmit}>
            <div className="form-title">
              <ClipboardList size={20} />
              <h2>
                {isObsidian
                  ? editingId
                    ? "编辑任务"
                    : "添加任务"
                  : editingId
                    ? "编辑任务"
                    : "添加任务"}
              </h2>
            </div>
            {isObsidian && <p className="form-code-hint">task.create()</p>}

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
                {isObsidian
                  ? editingId
                    ? "保存修改"
                    : "添加任务"
                  : editingId
                    ? "保存修改"
                    : "添加任务"}
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
                  <span className="log-info">[INFO]</span> {currentTheme.note}
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
            {filteredTasks.length === 0 ? (
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
                    className={`check-button ${task.completed ? "checked" : ""}`}
                    onClick={() => toggleTask(task.id)}
                    aria-label={task.completed ? "标记为未完成" : "标记为完成"}
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
                          <span className="code-string">"{task.title}"</span>
                          <span className="code-muted">,</span>
                        </div>
                        <div className="task-code-line">
                          <span className="code-property">category</span>
                          <span className="code-operator">:</span>{" "}
                          <span className="code-string">"{task.category}"</span>
                          <span className="code-muted">,</span>
                        </div>
                        <div className="task-code-line">
                          <span className="code-property">priority</span>
                          <span className="code-operator">:</span>{" "}
                          <span className={`priority priority-${task.priority}`}>
                            [{getPriorityCode(task.priority)}]
                          </span>
                          <span className="code-muted">,</span>
                        </div>
                        <div className="task-code-line">
                          <span className="code-property">due</span>
                          <span className="code-operator">:</span>{" "}
                          <span className="code-number">"{task.dueDate}"</span>
                          <span className="code-muted">,</span>
                        </div>
                        <div className="task-code-line">
                          <span className="code-property">status</span>
                          <span className="code-operator">:</span>{" "}
                          <span
                            className={
                              task.completed ? "code-success" : "code-warning"
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
                          <span className={`priority priority-${task.priority}`}>
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

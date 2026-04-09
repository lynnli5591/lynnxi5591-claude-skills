import { useState } from "react";

const TYPES = ["管理后台", "电商平台", "SaaS 工具", "移动端 App", "数据看板", "内部工具"];
const MODULES = [
  { icon: "👥", name: "用户管理" }, { icon: "📊", name: "数据报表" },
  { icon: "✅", name: "工作流审批" }, { icon: "🔔", name: "消息通知" },
  { icon: "🔐", name: "权限管理" }, { icon: "📁", name: "文件管理" },
];

const Cursor = () => (
  <span style={{ display:"inline-block", width:6, height:14, background:"#1D9E75", borderRadius:1, marginLeft:3, verticalAlign:"middle", animation:"blink 0.8s infinite" }} />
);

async function streamRequest(prompt, onChunk, maxTokens = 1500) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      stream: true,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") break;
      try {
        const j = JSON.parse(data);
        if (j.type === "content_block_delta" && j.delta?.text) {
          full += j.delta.text;
          onChunk(full);
        }
      } catch (e) {}
    }
  }
  return full;
}

function extractHtml(text) {
  const m = text.match(/```html\s*([\s\S]*?)```/s);
  if (m) return m[1].trim();
  const start = text.indexOf("<!DOCTYPE") !== -1 ? text.indexOf("<!DOCTYPE") : text.indexOf("<html");
  if (start !== -1) return text.slice(start).trim();
  return null;
}

function openProtoInNewWindow(html) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("请允许弹出窗口，或检查浏览器拦截设置");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export default function App() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [selectedModules, setSelectedModules] = useState([]);
  const [reqText, setReqText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [archContent, setArchContent] = useState("");
  const [roleContent, setRoleContent] = useState("");
  const [flowContent, setFlowContent] = useState("");
  const [roleVisible, setRoleVisible] = useState(false);
  const [flowVisible, setFlowVisible] = useState(false);
  const [plan, setPlan] = useState("");
  const [done, setDone] = useState(false);

  const [step3Mode, setStep3Mode] = useState("");
  const [step3Content, setStep3Content] = useState("");
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Done, setStep3Done] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refineInput, setRefineInput] = useState("");

  const [protoLoading, setProtoLoading] = useState(false);
  const [protoHtml, setProtoHtml] = useState("");
  const [protoStatus, setProtoStatus] = useState("");
  const [showCode, setShowCode] = useState(false);

  const toggleModule = (name) =>
    setSelectedModules(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);

  const parseSections = (text) => {
    const archMatch = text.match(/【功能架构】([\s\S]*?)(?=【角色设计】|$)/);
    const roleMatch = text.match(/【角色设计】([\s\S]*?)(?=【关键业务流程】|$)/);
    const flowMatch = text.match(/【关键业务流程】([\s\S]*?)$/);
    if (archMatch) setArchContent(archMatch[1].trim());
    if (roleMatch) { setRoleContent(roleMatch[1].trim()); setRoleVisible(true); }
    if (flowMatch) { setFlowContent(flowMatch[1].trim()); setFlowVisible(true); }
  };

  const startGenerate = async () => {
    if (!reqText.trim() && !selectedType) return;
    setLoading(true); setStep(2); setProgress(10); setError("");
    setArchContent(""); setRoleContent(""); setFlowContent("");
    setRoleVisible(false); setFlowVisible(false); setDone(false); setPlan("");
    setStep3Content(""); setStep3Done(false); setStep3Mode("");
    setProtoHtml(""); setProtoStatus("");

    const prompt = `你是一位经验丰富的产品经理。请根据以下需求，输出产品架构方案。

业务描述：${reqText || "未指定"}
系统类型：${selectedType || "未指定"}
核心模块：${selectedModules.join("、") || "未指定"}

请严格按以下格式输出（不要加任何额外说明）：

【功能架构】
（列出3-5个核心功能模块，每个模块2-3个子功能，用简洁的层级结构表示）

【角色设计】
（列出2-3个用户角色，说明每个角色的核心职责，每行一个角色，格式：角色名 — 职责描述）

【关键业务流程】
（描述最核心的1-2个业务流程，用简洁的箭头流程表示，如：A → B → C → 完成）`;

    try {
      let prog = 10;
      const full = await streamRequest(prompt, (text) => {
        prog = Math.min(90, prog + 1);
        setProgress(prog);
        parseSections(text);
      });
      setPlan(full);
      setProgress(100);
      setDone(true);
    } catch (e) {
      setError("生成失败，请重试");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const doRefine = async (extra = "") => {
    setStep3Mode("refine"); setStep3Loading(true);
    setStep3Content(""); setStep3Done(false); setStep(3);
    setShowRefineInput(false);

    const prompt = `你是一位产品经理。请优化以下产品架构方案，补充更多细节、边界情况和用户体验考量。${extra ? `\n\n用户补充说明：${extra}` : ""}

当前方案：
${plan}

请按原有格式（【功能架构】【角色设计】【关键业务流程】）输出优化后的完整方案，并在末尾加【优化说明】解释主要改动点。`;

    try {
      const full = await streamRequest(prompt, (text) => setStep3Content(text));
      setPlan(full);
      setStep3Done(true);
    } catch (e) {
      setStep3Content("生成失败，请重试");
    } finally {
      setStep3Loading(false);
    }
  };

  const doInteractiveProto = async () => {
    setStep(4); setProtoLoading(true); setProtoHtml("");
    setProtoStatus("正在生成原型代码..."); setShowCode(false);

    const prompt = `生成一个单文件 HTML 原型，要求：
1. 只输出 HTML，用 \`\`\`html 和 \`\`\` 包裹
2. 内联所有 CSS 和 JS，无外部依赖
3. 左侧导航栏 + 多个功能页面（点击切换）
4. 简洁的管理后台风格，蓝色主色 #1890ff
5. 每页包含表格或表单等真实 UI
6. 全中文

系统类型：${selectedType || "管理后台"}
需求：${reqText || "通用管理系统"}
模块：${selectedModules.length ? selectedModules.join("、") : "用户管理、数据报表"}

只输出代码，不要解释。`;

    try {
      let raw = "";
      let lastLen = 0;
      await streamRequest(prompt, (text) => {
        raw = text;
        const len = text.length;
        const pct = Math.min(95, Math.floor(len / 60));
        setProtoStatus(`生成中... ${pct}%（已生成 ${len} 字符）`);
        // 边生成边尝试提取，有完整 html 就先渲染
        if (len - lastLen > 500) {
          lastLen = len;
          const html = extractHtml(text);
          if (html && html.includes("</html>")) setProtoHtml(html);
        }
      }, 8000);

      const html = extractHtml(raw);
      if (html) {
        setProtoHtml(html);
        setProtoStatus("✅ 生成完成，点击下方按钮预览");
      } else if (raw.length > 100) {
        // 即使没有标准包裹也尝试直接用
        setProtoHtml(raw);
        setProtoStatus("✅ 生成完成，点击下方按钮预览");
      } else {
        setProtoStatus("❌ 生成内容为空，请重试");
      }
    } catch (e) {
      setProtoStatus(`❌ 生成失败：${e.message || "网络错误，请重试"}`);
    } finally {
      setProtoLoading(false);
    }
  };

  const doProtoSpec = async () => {
    setStep3Mode("spec"); setStep3Loading(true);
    setStep3Content(""); setStep3Done(false); setStep(3);

    const prompt = `你是一位前端工程师。根据以下产品架构方案，输出详细的原型实现说明：

1. **页面清单**：所有页面及路由
2. **各页面核心组件**：每个页面的主要 UI 组件
3. **关键交互逻辑**：核心交互流程步骤
4. **数据结构建议**：主要数据模型 JSON 示例
5. **实现建议**：技术栈推荐和注意事项

产品方案：
${plan}`;

    try {
      await streamRequest(prompt, (text) => setStep3Content(text));
      setStep3Done(true);
    } catch (e) {
      setStep3Content("生成失败，请重试");
    } finally {
      setStep3Loading(false);
    }
  };

  const downloadHtml = () => {
    if (!protoHtml) return;
    const blob = new Blob([protoHtml], { type:"text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `prototype-${Date.now()}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep(1); setProgress(0); setLoading(false); setError("");
    setSelectedType(""); setSelectedModules([]); setReqText("");
    setArchContent(""); setRoleContent(""); setFlowContent("");
    setRoleVisible(false); setFlowVisible(false); setPlan(""); setDone(false);
    setStep3Content(""); setStep3Done(false); setStep3Mode("");
    setShowRefineInput(false); setRefineInput("");
    setProtoHtml(""); setProtoStatus(""); setShowCode(false);
  };

  const backToPlan = () => {
    setStep(2); setStep3Content(""); setStep3Done(false);
    setStep3Mode(""); setShowRefineInput(false); setRefineInput("");
  };

  const StepDot = ({ n, label }) => {
    const current = step === n, passed = step > n;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{
          width:20, height:20, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:10, fontWeight:500,
          background: passed ? "#E1F5EE" : current ? "#1D9E75" : "transparent",
          border: `0.5px solid ${passed ? "#5DCAA5" : current ? "#1D9E75" : "var(--color-border-secondary)"}`,
          color: passed ? "#0F6E56" : current ? "#fff" : "var(--color-text-secondary)"
        }}>{passed ? "✓" : n}</div>
        <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>{label}</span>
      </div>
    );
  };

  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"1.5rem 1rem", fontFamily:"var(--font-sans)" }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin { to { transform:rotate(360deg); } }
        .tag { padding:4px 12px; border-radius:20px; font-size:12px; cursor:pointer; border:0.5px solid var(--color-border-tertiary); color:var(--color-text-secondary); background:var(--color-background-secondary); transition:all 0.2s; user-select:none; }
        .tag.sel { background:#E1F5EE; border-color:#5DCAA5; color:#0F6E56; }
        .mod { border:0.5px solid var(--color-border-tertiary); border-radius:8px; padding:10px 8px; text-align:center; cursor:pointer; transition:all 0.2s; background:var(--color-background-primary); }
        .mod:hover { border-color:var(--color-border-secondary); }
        .mod.sel { border-color:#5DCAA5; background:#E1F5EE; }
        .mod .mn { font-size:11px; color:var(--color-text-secondary); margin-top:4px; }
        .mod.sel .mn { color:#0F6E56; }
        textarea:focus { outline:none; border-color:#1D9E75 !important; }
      `}</style>

      {/* Hero */}
      <div style={{ textAlign:"center", padding:"1.5rem 0 1rem" }}>
        <h1 style={{ fontSize:22, fontWeight:500, color:"var(--color-text-primary)", marginBottom:8 }}>产品原型生成器</h1>
        <p style={{ fontSize:14, color:"var(--color-text-secondary)", lineHeight:1.6 }}>
          描述你的业务场景，AI 帮你规划功能模块、角色权限和完整的可交互原型
        </p>
      </div>

      {/* 4-step indicator */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:"1.5rem", flexWrap:"wrap" }}>
        <StepDot n={1} label="需求输入" />
        <div style={{ width:14, height:0.5, background:"var(--color-border-tertiary)" }} />
        <StepDot n={2} label="架构规划" />
        <div style={{ width:14, height:0.5, background:"var(--color-border-tertiary)" }} />
        <StepDot n={3} label="深化方案" />
        <div style={{ width:14, height:0.5, background:"var(--color-border-tertiary)" }} />
        <StepDot n={4} label="可交互原型" />
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <>
          <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1.25rem", marginBottom:12 }}>
            <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:8 }}>选择系统类型</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
              {TYPES.map(t => (
                <div key={t} className={`tag${selectedType === t ? " sel" : ""}`} onClick={() => setSelectedType(t === selectedType ? "" : t)}>{t}</div>
              ))}
            </div>
            <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:8 }}>描述你的业务需求</div>
            <textarea value={reqText} onChange={e => setReqText(e.target.value)}
              placeholder="例如：我需要一个企业薪资管理系统，支持 HR 录入员工信息、计算工资、生成工资条，管理员可以查看报表和审批..."
              style={{ width:"100%", minHeight:100, padding:"10px 12px", fontSize:14, fontFamily:"var(--font-sans)", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, resize:"vertical", background:"var(--color-background-primary)", color:"var(--color-text-primary)", lineHeight:1.6 }}
            />
          </div>
          <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1.25rem", marginBottom:12 }}>
            <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:10 }}>核心功能模块（可多选）</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:8 }}>
              {MODULES.map(m => (
                <div key={m.name} className={`mod${selectedModules.includes(m.name) ? " sel" : ""}`} onClick={() => toggleModule(m.name)}>
                  <div style={{ fontSize:18 }}>{m.icon}</div>
                  <div className="mn">{m.name}</div>
                </div>
              ))}
            </div>
          </div>
          {error && <div style={{ color:"var(--color-text-danger)", fontSize:13, marginBottom:8 }}>{error}</div>}
          <button onClick={startGenerate} disabled={!reqText.trim() && !selectedType}
            style={{ width:"100%", padding:10, background:"#1D9E75", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:(!reqText.trim() && !selectedType) ? "not-allowed" : "pointer", opacity:(!reqText.trim() && !selectedType) ? 0.5 : 1 }}>
            生成架构方案 ↗
          </button>
        </>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <>
          <div style={{ height:3, background:"var(--color-border-tertiary)", borderRadius:2, marginBottom:16, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${progress}%`, background:"#1D9E75", borderRadius:2, transition:"width 0.4s" }} />
          </div>
          <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1.25rem", marginBottom:12 }}>
            <div style={{ background:"var(--color-background-secondary)", borderRadius:8, padding:"1rem", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:8 }}>📋 功能架构</div>
              <div style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                {archContent}{!roleVisible && loading && <Cursor />}
              </div>
            </div>
            {roleVisible && (
              <div style={{ background:"var(--color-background-secondary)", borderRadius:8, padding:"1rem", marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:8 }}>👤 角色设计</div>
                <div style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                  {roleContent}{!flowVisible && loading && <Cursor />}
                </div>
              </div>
            )}
            {flowVisible && (
              <div style={{ background:"var(--color-background-secondary)", borderRadius:8, padding:"1rem" }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:8 }}>🔄 关键业务流程</div>
                <div style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                  {flowContent}{loading && <Cursor />}
                </div>
              </div>
            )}
          </div>
          {done && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={doInteractiveProto}
                style={{ width:"100%", padding:"11px 16px", background:"#1D9E75", border:"none", borderRadius:8, fontSize:14, color:"#fff", cursor:"pointer", fontWeight:500 }}>
                ⚡ 生成完整可交互原型
              </button>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <button onClick={() => setShowRefineInput(v => !v)}
                  style={{ padding:"9px 16px", background:"transparent", border:"0.5px solid #5DCAA5", borderRadius:8, fontSize:13, color:"#0F6E56", cursor:"pointer" }}>
                  ✏️ 调整优化方案
                </button>
                <button onClick={doProtoSpec}
                  style={{ padding:"9px 16px", background:"transparent", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, fontSize:13, color:"var(--color-text-secondary)", cursor:"pointer" }}>
                  📄 查看原型规格
                </button>
              </div>
              {showRefineInput && (
                <div style={{ background:"var(--color-background-secondary)", borderRadius:8, padding:"1rem" }}>
                  <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:6 }}>补充说明（可选）：哪些地方需要调整？</div>
                  <textarea value={refineInput} onChange={e => setRefineInput(e.target.value)}
                    placeholder="例如：需要增加移动端支持、审批流程需要更细化..."
                    style={{ width:"100%", minHeight:70, padding:"8px 10px", fontSize:13, fontFamily:"var(--font-sans)", border:"0.5px solid var(--color-border-secondary)", borderRadius:6, resize:"vertical", background:"var(--color-background-primary)", color:"var(--color-text-primary)", marginBottom:8 }}
                  />
                  <button onClick={() => doRefine(refineInput)}
                    style={{ width:"100%", padding:8, background:"#1D9E75", color:"#fff", border:"none", borderRadius:6, fontSize:13, cursor:"pointer" }}>
                    确认优化 ↗
                  </button>
                </div>
              )}
              <button onClick={reset}
                style={{ padding:8, background:"transparent", border:"0.5px solid var(--color-border-tertiary)", borderRadius:8, fontSize:12, color:"var(--color-text-secondary)", cursor:"pointer" }}>
                重新开始
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <>
          <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1.25rem", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:12 }}>
              {step3Mode === "refine" ? "✏️ 优化后的架构方案" : "📄 原型规格说明"}
            </div>
            <div style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.8, whiteSpace:"pre-wrap" }}>
              {step3Content}{step3Loading && <Cursor />}
            </div>
          </div>
          {step3Done && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={doInteractiveProto}
                style={{ width:"100%", padding:10, background:"#1D9E75", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
                ⚡ 生成完整可交互原型
              </button>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <button onClick={backToPlan}
                  style={{ padding:8, background:"transparent", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, fontSize:12, color:"var(--color-text-secondary)", cursor:"pointer" }}>
                  ← 返回架构方案
                </button>
                <button onClick={reset}
                  style={{ padding:8, background:"transparent", border:"0.5px solid var(--color-border-tertiary)", borderRadius:8, fontSize:12, color:"var(--color-text-secondary)", cursor:"pointer" }}>
                  重新开始
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Step 4 — 原型生成结果 ── */}
      {step === 4 && (
        <>
          <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1.25rem", marginBottom:12 }}>
            {/* 状态区 */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: protoHtml ? 16 : 0 }}>
              {protoLoading && (
                <div style={{ width:14, height:14, border:"2px solid #E1F5EE", borderTop:"2px solid #1D9E75", borderRadius:"50%", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
              )}
              {!protoLoading && protoHtml && <span style={{ fontSize:16 }}>✅</span>}
              <span style={{ fontSize:13, color: protoLoading ? "#1D9E75" : "var(--color-text-secondary)" }}>
                {protoStatus}
              </span>
            </div>

            {/* 原型就绪后的操作 */}
            {protoHtml && !protoLoading && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button onClick={() => openProtoInNewWindow(protoHtml)}
                  style={{ width:"100%", padding:"11px 16px", background:"#1D9E75", border:"none", borderRadius:8, fontSize:14, color:"#fff", cursor:"pointer", fontWeight:500 }}>
                  ▶ 打开原型预览
                </button>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <button onClick={downloadHtml}
                    style={{ padding:"9px 16px", background:"transparent", border:"0.5px solid #5DCAA5", borderRadius:8, fontSize:13, color:"#0F6E56", cursor:"pointer" }}>
                    ↓ 下载 HTML
                  </button>
                  <button onClick={() => setShowCode(v => !v)}
                    style={{ padding:"9px 16px", background:"transparent", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, fontSize:13, color:"var(--color-text-secondary)", cursor:"pointer" }}>
                    {showCode ? "隐藏代码" : "查看源码"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 源码展示 */}
          {showCode && protoHtml && (
            <div style={{ background:"#1e1e1e", borderRadius:12, padding:"1rem", overflow:"auto", maxHeight:400, marginBottom:12 }}>
              <pre style={{ fontSize:11, color:"#d4d4d4", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-all", lineHeight:1.6 }}>
                {protoHtml}
              </pre>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {!protoLoading && (
              <button onClick={doInteractiveProto}
                style={{ padding:8, background:"transparent", border:"0.5px solid #5DCAA5", borderRadius:8, fontSize:12, color:"#0F6E56", cursor:"pointer" }}>
                重新生成原型
              </button>
            )}
            <button onClick={backToPlan}
              style={{ padding:8, background:"transparent", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, fontSize:12, color:"var(--color-text-secondary)", cursor:"pointer" }}>
              ← 返回架构方案
            </button>
          </div>
        </>
      )}
    </div>
  );
}

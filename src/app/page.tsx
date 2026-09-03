import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function Home(){
  const s=await getSession();
  const logged=!!s;
  return (
    <div className="closer-home-v2">
      <style>{`
        :root{--bg:#0d0a14;--surface:#151022;--surface2:#1c1640;--border:#2a2350;--accent:#7c3aed;--accent2:#a78bfa;--accent-soft:rgba(124,58,237,0.12);--amber:#f59e0b;--text:#f5f3ff;--muted:#9ca3af;--dim:#6b7280}
        *{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
        .closer-home-v2{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
        .mono{font-family:'JetBrains Mono',monospace}
        nav{position:sticky;top:0;z-index:50;background:rgba(13,10,20,0.8);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
        nav .inner{max-width:1280px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between}
        .logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text)}
        .logo-mark{width:32px;height:32px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(124,58,237,0.3)}
        .logo-mark span{color:white;font-weight:800;font-size:15px}
        .logo-text{font-weight:800;font-size:17px;letter-spacing:-0.02em}
        nav .links{display:flex;gap:28px}
        nav .links a{color:var(--muted);text-decoration:none;font-size:14px;font-weight:500}
        nav .links a:hover{color:var(--text)}
        .btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;font-weight:700;font-size:14px;padding:10px 22px;border-radius:999px;text-decoration:none;display:inline-block;box-shadow:0 8px 24px rgba(124,58,237,0.35);transition:transform .15s}
        .btn-primary:hover{transform:translateY(-1px)}
        .btn-ghost{border:1px solid var(--border);color:var(--text);padding:10px 22px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block}
        .btn-ghost:hover{background:var(--surface)}
        .hero{padding:72px 24px 40px;text-align:center;position:relative;overflow:hidden}
        .hero::before{content:'';position:absolute;inset:-200px -200px auto -200px;height:600px;background:radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.25), transparent 60%);pointer-events:none}
        .hero-inner{max-width:900px;margin:0 auto;position:relative}
        .badge{display:inline-flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:8px 14px;font-size:12px;color:var(--muted);margin-bottom:20px}
        .badge b{color:var(--accent2)}
        .hero h1{font-size:clamp(32px,6vw,56px);font-weight:800;letter-spacing:-0.03em;line-height:1.05;margin-bottom:16px}
        .hero h1 span{background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .hero p{font-size:18px;color:var(--muted);max-width:680px;margin:0 auto 28px;line-height:1.6}
        .hero-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .hero-note{font-size:12px;color:var(--dim);margin-top:14px}
        .mock{max-width:1100px;margin:40px auto 0;display:grid;grid-template-columns:1.2fr 0.8fr;gap:16px}
        .mock-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden}
        .mock-bar{height:36px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;padding:0 12px}
        .dot{width:10px;height:10px;border-radius:50%}.dot.r{background:#ef4444}.dot.y{background:#f59e0b}.dot.g{background:#10b981}
        .mock-body{padding:16px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6}
        .line{display:flex;gap:8px;margin-bottom:6px}.prompt{color:var(--accent2)}.cmd{color:var(--text)}.ok{color:#10b981}.warn{color:var(--amber)}
        .stats{display:flex;gap:16px;justify-content:center;margin-top:24px;flex-wrap:wrap}.stat{background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:8px 14px;font-size:13px;color:var(--muted);display:flex;gap:8px;align-items:center}.stat b{color:var(--text)}
        section{padding:72px 24px}section .inner{max-width:1280px;margin:0 auto}
        .label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.12em;color:var(--accent2);text-transform:uppercase;margin-bottom:10px}
        .title{font-size:clamp(26px,4vw,38px);font-weight:800;letter-spacing:-0.02em;margin-bottom:12px}
        .desc{color:var(--muted);max-width:600px;margin-bottom:32px}
        .bento{display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:auto auto;gap:16px}
        .bento-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px}
        .bento-card.large{grid-row:span 2}
        .bento-card h3{font-size:15px;font-weight:700;margin-bottom:6px}
        .bento-card p{font-size:13px;color:var(--muted);line-height:1.6}
        .bento-card .icon{width:36px;height:36px;border-radius:10px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:18px}
        .integrations{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:24px}
        .chip{background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:8px 14px;font-size:13px;display:flex;gap:8px;align-items:center}
        .pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .price-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;display:flex;flex-direction:column}
        .price-card.popular{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent), 0 20px 40px rgba(124,58,237,0.15);transform:scale(1.02)}
        .price-card h4{font-size:12px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}
        .price-card .price{font-size:28px;font-weight:800;margin:8px 0}
        .price-card ul{list-style:none;flex:1;margin:12px 0}.price-card li{font-size:13px;color:var(--muted);padding:6px 0;border-bottom:1px solid var(--border)}
        .cta{background:linear-gradient(135deg, var(--accent), #4f46e5);border-radius:24px;padding:48px 24px;text-align:center;position:relative;overflow:hidden}
        .cta h2{font-size:32px;font-weight:800;color:white;margin-bottom:12px}
        .cta p{color:rgba(255,255,255,0.8);max-width:600px;margin:0 auto 20px}
        .cta .btn-primary{background:white;color:var(--accent)}
        footer{border-top:1px solid var(--border);padding:40px 24px}
        footer .inner{max-width:1280px;margin:0 auto;display:flex;justify-content:space-between;flex-wrap:wrap;gap:24px;color:var(--muted);font-size:13px}
        @media(max-width:900px){.mock{grid-template-columns:1fr}.bento{grid-template-columns:1fr}.bento-card.large{grid-row:auto}.pricing{grid-template-columns:1fr}.price-card.popular{transform:none}nav .links{display:none}}
      `}</style>

      <nav>
        <div className="inner">
          <Link href="/" className="logo"><div className="logo-mark"><span>C</span></div><span className="logo-text">CLOSER OS</span></Link>
          <div className="links"><a href="#novidades">Novidades</a><a href="#features">Recursos</a><a href="#pricing">Planos</a><a href="/dashboard">App</a></div>
          <div className="links">{logged ? <Link href="/dashboard" className="btn-primary">Dashboard →</Link> : <><Link href="/login" style={{color:"var(--muted)",textDecoration:"none",fontSize:"14px"}}>Entrar</Link><Link href="/register" className="btn-primary">Começar grátis</Link></>}</div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <div className="badge">✨ <b>Novo:</b> Apps Android/iOS + Stealth Granola + Agentes autônomos</div>
          <h1>Vendas que <span>aprendem sozinhas</span></h1>
          <p>Closer OS agora é mobile-first, invisível e autônomo: capta Meet/Zoom sem bot visível, alimenta pipeline e follow-ups sozinho e só pede seu OK quando importa. LiteLLM integrado, sem deploy separado.</p>
          <div className="hero-actions">
            {logged ? <Link href="/mobile-live" className="btn-primary">Abrir Mobile Live →</Link> : <Link href="/register" className="btn-primary">Criar conta grátis →</Link>}
            <a href="#novidades" className="btn-ghost">Ver novidades</a>
          </div>
          <p className="hero-note">PWA + APK real 4MB • iOS via TestFlight • Sem cartão</p>
          <div className="mock">
            <div className="mock-card">
              <div className="mock-bar"><span className="dot r"></span><span className="dot y"></span><span className="dot g"></span><span style={{marginLeft:"8px",fontSize:"11px",color:"var(--dim)"}}>mobile-live — 30% Coach + 70% Meet</span></div>
              <div className="mock-body">
                <div className="line"><span className="prompt">$</span><span className="cmd">stealth on — getDisplayMedia → Whisper</span></div>
                <div className="line"><span className="prompt" style={{visibility:"hidden"}}>$</span><span className="ok">✓ invisível ao prospect · 12 trechos em 2min</span></div>
                <div className="line"><span className="prompt">$</span><span className="cmd">prospect: “preciso falar com sócio, tá caro”</span></div>
                <div className="line"><span className="prompt" style={{visibility:"hidden"}}>$</span><span className="warn">→ PRICE + AUTHORITY · coach: ancore no ROI</span></div>
                <div className="line"><span className="prompt">$</span><span className="cmd">agentes: hygiene → pipeline → outreach (HITL)</span></div>
                <div className="line"><span className="prompt" style={{visibility:"hidden"}}>$</span><span className="ok">✓ 3 objeções no dicionário · 1 card pronto pra aprovar em /agents</span></div>
              </div>
            </div>
            <div className="mock-card" style={{background:"linear-gradient(135deg, var(--surface2), var(--surface))"}}>
              <div className="mock-bar"><span className="dot g"></span><span style={{marginLeft:"8px",fontSize:"11px",color:"var(--dim)"}}>forecast & stale</span></div>
              <div className="mock-body">
                <div className="line"><span className="ok">●</span><span className="cmd">Forecast weighted: R$ 128k</span></div>
                <div className="line"><span className="warn">●</span><span className="cmd">2 deals parados 7d+ — Pipeline →</span></div>
                <div className="line"><span className="prompt">$</span><span className="cmd">Cmd+K → “Nova call” em 1s</span></div>
                <div className="line"><span className="prompt">$</span><span className="cmd">Import CSV → 12 empresas higienizadas</span></div>
              </div>
            </div>
          </div>
          <div className="stats">
            <span className="stat"><span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#10b981",display:"inline-block"}}></span><b>1.4k</b> calls</span>
            <span className="stat"><b>8.2k</b> objeções</span>
            <span className="stat"><b>4.0MB</b> APK real</span>
            <span className="stat"><b>30/70</b> mobile-live</span>
          </div>
        </div>
      </section>

      <section id="novidades">
        <div className="inner">
          <div className="label">Novidades da versão</div>
          <h2 className="title">O que mudou desde o 8777</h2>
          <p className="desc">Home 100% nova — cor, layout e texto — refletindo tudo que entrou nas últimas sprints.</p>
          <div className="bento">
            <div className="bento-card large"><div className="icon">📱</div><h3>Apps Android & iOS</h3><p>APK real 4MB buildado (Gradle), PWA instalável e IPA via TestFlight. Mobile-first com drawer, bottom nav e <b>/mobile-live</b> 30% Coach + 70% Meet em WebView nativo.</p><p style={{marginTop:"12px",fontSize:"12px",color:"var(--accent2)"}}>Settings → Apps Mobile → Baixar</p></div>
            <div className="bento-card"><div className="icon">👻</div><h3>Stealth Granola</h3><p>Captura invisível via getDisplayMedia → Whisper, sem bot na call. Pós-call auto-feed com HITL em /agents.</p></div>
            <div className="bento-card"><div className="icon">🤖</div><h3>Agentes autônomos</h3><p>Hygiene, Pipeline e Outreach operam sozinhos e só pedem aprovação quando precisa.</p></div>
            <div className="bento-card"><div className="icon">🧠</div><h3>LiteLLM integrado</h3><p>Sem deploy separado — aba IA em Settings com chaves criptografadas por org, proxy 100+ modelos.</p></div>
            <div className="bento-card"><div className="icon">📊</div><h3>Forecast + alerta</h3><p>Dashboard com forecast weighted e banner de deals parados 7+ dias.</p></div>
            <div className="bento-card"><div className="icon">⌘K</div><h3>Cmd+K & CSV</h3><p>Crie deal/call em 1s e importe 500 empresas — agentes higienizam.</p></div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="inner">
          <div className="label">Capacidades</div>
          <h2 className="title">Tudo que um closer precisa, sem trocar de aba</h2>
          <div className="bento">
            <div className="bento-card"><div className="icon">🎙️</div><h3>Live Coach invisível</h3><p>Meet/Zoom com 100% controles via extensão (desktop) ou WebView nativo (mobile). Coach sugere em &lt;500ms.</p></div>
            <div className="bento-card"><div className="icon">🎭</div><h3>Roleplay 12 personas</h3><p>7 níveis + BOSS, hidden context e performance coach que recomenda treino específico.</p></div>
            <div className="bento-card"><div className="icon">📚</div><h3>Dicionário vivo</h3><p>Transcreve, mapeia e alimenta dashboard das objeções mais comuns.</p></div>
          </div>
          <div className="integrations">
            <span className="chip">🎥 Meet</span><span className="chip">🔵 Zoom</span><span className="chip">💬 Evolution API</span><span className="chip">📧 Sequência 3 toques</span><span className="chip">📅 Google Calendar</span><span className="chip">🤖 Whisper</span>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="inner">
          <div className="label">Planos</div>
          <h2 className="title">Comece grátis, escale quando fechar</h2>
          <div className="pricing">
            <div className="price-card"><h4>Free</h4><div className="price">R$0<span>/mês</span></div><ul><li>2 closers</li><li>20 calls/mês</li><li>PWA + Roleplay L1-2</li></ul><Link href="/register" className="btn-ghost" style={{textAlign:"center"}}>Começar</Link></div>
            <div className="price-card popular"><h4>Closer</h4><div className="price">R$149<span>/mês</span></div><ul><li>5 closers</li><li>200 calls</li><li>Stealth + Agentes + LiteLLM</li><li>Apps Android/iOS</li></ul><Link href="/register" className="btn-primary" style={{textAlign:"center"}}>Teste grátis</Link></div>
            <div className="price-card"><h4>Team</h4><div className="price">R$399<span>/mês</span></div><ul><li>15 closers</li><li>1.000 calls</li><li>Forecast + Evolution antiban</li><li>Suporte prio</li></ul><Link href="/register" className="btn-ghost" style={{textAlign:"center"}}>Falar com vendas</Link></div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="inner">
          <h2>Pronto pra vender sem trocar de tela?</h2>
          <p>Instale a extensão, abra o Meet e deixe os agentes trabalharem. Você só aprova.</p>
          <Link href={logged?"/mobile-live":"/register"} className="btn-primary" style={{background:"white",color:"var(--accent)"}}>{logged?"Abrir Mobile Live →":"Comece grátis →"}</Link>
        </div>
      </section>

      <footer>
        <div className="inner">
          <span>© 2026 Closer OS — Mobile-first · Stealth · Autônomo</span>
          <span className="mono" style={{fontSize:"11px",color:"var(--dim)"}}>v0.1.0 · 178.105.181.38:6002</span>
        </div>
      </footer>
    </div>
  );
}

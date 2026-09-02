import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function Home(){
  const s = await getSession();
  const logged = !!s;
  return (
    <div className="closer-home">
      <style>{`
        :root{--bg:#0a0a0a;--surface:#111111;--surface-2:#161616;--border:#1f1f1f;--border-hover:#2a2a2a;--cyan:#00e5a0;--cyan-dim:#00e5a020;--purple:#a78bfa;--amber:#fbbf24;--text:#e5e5e5;--text-dim:#737373;--text-muted:#525252;--red:#ef4444}
        *{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
        .closer-home{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
        .mono{font-family:'JetBrains Mono',monospace}
        nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,10,10,0.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
        nav .inner{max-width:1200px;margin:0 auto;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
        .logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text)}
        .logo-mark{width:28px;height:28px;background:var(--cyan);border-radius:6px;display:flex;align-items:center;justify-content:center}
        .logo-mark span{color:var(--bg);font-family:'JetBrains Mono',monospace;font-weight:700;font-size:14px}
        .logo-text{font-weight:700;font-size:16px;letter-spacing:-0.02em}
        nav .links{display:flex;gap:32px}
        nav .links a{color:var(--text-dim);text-decoration:none;font-size:14px;transition:color .15s}
        nav .links a:hover{color:var(--text)}
        nav .cta-group{display:flex;align-items:center;gap:16px}
        nav .cta-group a{color:var(--text-dim);text-decoration:none;font-size:14px}
        nav .cta-group a:hover{color:var(--text)}
        .btn-primary{background:var(--cyan);color:var(--bg);font-weight:600;font-size:14px;padding:8px 20px;border-radius:8px;text-decoration:none;transition:all .15s;border:none;cursor:pointer;display:inline-block}
        .btn-primary:hover{box-shadow:0 0 20px rgba(0,229,160,0.3)}
        .btn-ghost{background:transparent;color:var(--text);border:1px solid var(--border);font-weight:500;font-size:14px;padding:8px 20px;border-radius:8px;text-decoration:none;transition:all .15s;cursor:pointer;display:inline-block}
        .btn-ghost:hover{border-color:var(--border-hover);background:var(--surface)}
        .hero{min-height:100vh;display:flex;align-items:center;padding:80px 24px 60px;position:relative;overflow:hidden}
        .hero::before{content:'';position:absolute;top:-200px;right:-200px;width:600px;height:600px;background:radial-gradient(circle, rgba(0,229,160,0.08) 0%, transparent 70%);pointer-events:none}
        .hero::after{content:'';position:absolute;bottom:-100px;left:-100px;width:400px;height:400px;background:radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%);pointer-events:none}
        .hero-inner{max-width:1200px;margin:0 auto;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
        .hero-badge{display:inline-flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:100px;padding:6px 16px;font-size:13px;color:var(--text-dim);margin-bottom:24px}
        .hero-badge .dot{width:6px;height:6px;border-radius:50%;background:var(--cyan);animation:pulse 2s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .hero h1{font-size:clamp(36px,5vw,64px);font-weight:700;line-height:1.1;letter-spacing:-0.03em;margin-bottom:20px}
        .hero h1 .accent{color:var(--cyan)}
        .hero p{font-size:18px;color:var(--text-dim);max-width:480px;margin-bottom:32px;line-height:1.7}
        .hero-actions{display:flex;gap:12px;flex-wrap:wrap}
        .hero-note{font-size:13px;color:var(--text-muted);margin-top:16px}
        .terminal{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.7;position:relative;z-index:1}
        .terminal-bar{display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--surface-2);border-bottom:1px solid var(--border)}
        .terminal-dot{width:10px;height:10px;border-radius:50%}.terminal-dot.r{background:var(--red)}.terminal-dot.y{background:var(--amber)}.terminal-dot.g{background:var(--cyan)}
        .terminal-title{color:var(--text-muted);font-size:12px;margin-left:8px}
        .terminal-body{padding:16px}.terminal-line{display:flex;gap:8px;margin-bottom:4px}.terminal-prompt{color:var(--cyan);white-space:nowrap}.terminal-cmd{color:var(--text)}.terminal-output{color:var(--text-dim);margin-left:20px}.terminal-success{color:var(--cyan)}.terminal-warn{color:var(--amber)}
        .status-bar{display:flex;gap:24px;margin-top:32px;flex-wrap:wrap}.status-item{display:flex;align-items:center;gap:8px}.status-dot{width:8px;height:8px;border-radius:50%}.status-dot.green{background:var(--cyan);box-shadow:0 0 8px rgba(0,229,160,0.5)}.status-label{font-size:13px;color:var(--text-dim)}.status-value{font-size:13px;color:var(--text);font-weight:500}
        section{padding:96px 24px}section .inner{max-width:1200px;margin:0 auto}
        .section-label{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--cyan);text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px}
        .section-title{font-size:clamp(28px,3.5vw,44px);font-weight:700;letter-spacing:-0.02em;margin-bottom:16px;line-height:1.15}
        .section-desc{font-size:17px;color:var(--text-dim);max-width:560px;line-height:1.7;margin-bottom:48px}
        .feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:12px;overflow:hidden}
        .feature-card{background:var(--surface);padding:32px;transition:background .15s}.feature-card:hover{background:var(--surface-2)}
        .feature-icon{font-size:20px;margin-bottom:16px}.feature-title{font-size:15px;font-weight:600;margin-bottom:8px}.feature-desc{font-size:14px;color:var(--text-dim);line-height:1.6}
        .channel-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.channel-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;text-align:center;transition:all .15s}.channel-card:hover{border-color:var(--cyan);transform:translateY(-2px)}.channel-icon{font-size:24px;margin-bottom:8px}.channel-name{font-size:13px;font-weight:500}
        .pricing-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:12px;overflow:hidden}
        .pricing-card{background:var(--surface);padding:32px;display:flex;flex-direction:column}.pricing-card.featured{background:var(--surface-2);position:relative}.pricing-card.featured::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--cyan)}
        .pricing-tier{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
        .pricing-name{font-size:18px;font-weight:600;margin-bottom:16px}.pricing-price{font-size:32px;font-weight:700;margin-bottom:24px}.pricing-price span{font-size:14px;font-weight:400;color:var(--text-dim)}
        .pricing-features{list-style:none;flex:1;margin-bottom:24px}.pricing-features li{font-size:14px;color:var(--text-dim);padding:6px 0;border-bottom:1px solid var(--border)}.pricing-features li:last-child{border-bottom:none}
        .cta-section{text-align:center;position:relative;overflow:hidden}.cta-section::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(0,229,160,0.06) 0%, transparent 60%);pointer-events:none}.cta-section .inner{position:relative;z-index:1}
        footer{border-top:1px solid var(--border);padding:48px 24px}footer .inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px}footer .brand p{font-size:14px;color:var(--text-dim);margin-top:12px;max-width:280px}
        footer h4{font-size:13px;font-weight:600;margin-bottom:16px}footer ul{list-style:none}footer ul li{margin-bottom:8px}footer ul a{color:var(--text-dim);text-decoration:none;font-size:14px}footer ul a:hover{color:var(--text)}footer .bottom{max-width:1200px;margin:48px auto 0;padding-top:24px;border-top:1px solid var(--border);display:flex;justify-content:space-between;color:var(--text-muted);font-size:13px}
        @media(max-width:900px){.hero-inner{grid-template-columns:1fr}.terminal{display:none}.feature-grid{grid-template-columns:1fr}.channel-grid{grid-template-columns:repeat(3,1fr)}.pricing-grid{grid-template-columns:1fr}footer .inner{grid-template-columns:1fr 1fr}}
        @media(max-width:600px){nav .links{display:none}.channel-grid{grid-template-columns:repeat(2,1fr)}.hero h1{font-size:32px}footer .inner{grid-template-columns:1fr}}
      `}</style>

      <nav>
        <div className="inner">
          <Link href="/" className="logo"><div className="logo-mark"><span>C</span></div><span className="logo-text">CLOSER OS</span></Link>
          <div className="links">
            <a href="#features">Recursos</a>
            <a href="#live">Live Coach</a>
            <a href="#pricing">Planos</a>
            <a href="/dashboard">App</a>
          </div>
          <div className="cta-group">
            {logged ? <Link href="/dashboard" className="btn-primary">Ir para Dashboard →</Link> : <><Link href="/login">Entrar</Link><Link href="/register" className="btn-primary">Começar agora</Link></>}
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-badge"><span className="dot"></span><span className="mono">v0.1.0 — Live Coach + Roleplay ao vivo</span></div>
            <h1>Seu time fecha mais<br/><span className="accent">com IA ao vivo</span></h1>
            <p>Closer OS é o Sistema Operacional de Vendas com IA: transcreve Meet/Zoom sem sair da plataforma, mapeia objeções em tempo real, treina com roleplay e transforma cada call em coaching.</p>
            <div className="hero-actions">
              {logged ? <Link href="/live" className="btn-primary">Abrir Live Coach →</Link> : <Link href="/register" className="btn-primary">Comece grátis →</Link>}
              <a href="#features" className="btn-ghost">Veja como funciona</a>
            </div>
            <p className="hero-note">Sem cartão · Transcrição + dicionário de objeções · Roleplay ilimitado</p>
            <div className="status-bar">
              <div className="status-item"><span className="status-dot green"></span><span className="status-label">Calls analisadas</span><span className="status-value">1.4k</span></div>
              <div className="status-item"><span className="status-dot green"></span><span className="status-label">Objeções mapeadas</span><span className="status-value">8.2k</span></div>
              <div className="status-item"><span className="status-dot green"></span><span className="status-label">Uptime</span><span className="status-value">99.9%</span></div>
            </div>
          </div>
          <div className="terminal">
            <div className="terminal-bar"><span className="terminal-dot r"></span><span className="terminal-dot y"></span><span className="terminal-dot g"></span><span className="terminal-title">closer — live coach</span></div>
            <div className="terminal-body">
              <div className="terminal-line"><span className="terminal-prompt">$</span><span className="terminal-cmd">closer live --meet https://meet.google.com/abc-defg-hij</span></div>
              <div className="terminal-line"><span className="terminal-prompt" style={{visibility:"hidden"}}>$</span><span className="terminal-success">✓ Conectado ao Meet · transcrição ao vivo ativa</span></div>
              <div className="terminal-line"><span className="terminal-prompt">$</span><span className="terminal-cmd">prospect: “está muito caro, preciso falar com sócio”</span></div>
              <div className="terminal-line"><span className="terminal-prompt" style={{visibility:"hidden"}}>$</span><span className="terminal-warn">→ Objeção: PRICE + AUTHORITY detectada</span></div>
              <div className="terminal-line"><span className="terminal-prompt" style={{visibility:"hidden"}}>$</span><span className="terminal-success">coach: “Ancore no ROI: quanto custa não resolver/mês?”</span></div>
              <div className="terminal-line"><span className="terminal-prompt">$</span><span className="terminal-cmd">closer analyze --call c_7x9k2m</span></div>
              <div className="terminal-line"><span className="terminal-prompt" style={{visibility:"hidden"}}>$</span><span className="terminal-success">✓ Score 64 · 2 strengths · 3 melhorias · 3 roleplays sugeridos</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="inner">
          <div className="section-label">01 / Capacidades</div>
          <h2 className="section-title">Feito para closers,<br/>não para demos</h2>
          <p className="section-desc">Cada recurso nasceu de uma call real. Sem enfeites — só o que faz você fechar.</p>
          <div className="feature-grid">
            <div className="feature-card"><div className="feature-icon">🎙️</div><div className="feature-title">Live Sales Coach</div><div className="feature-desc">Meet/Zoom embedado + Web Speech ao vivo. Detecta objeção em &lt;500ms e te diz exatamente o que falar.</div></div>
            <div className="feature-card"><div className="feature-icon">🎭</div><div className="feature-title">Roleplay com IA</div><div className="feature-desc">12 personas, 7 níveis + BOSS. Hidden context, avaliação com decisive moments e skill scores 0-100.</div></div>
            <div className="feature-card"><div className="feature-icon">📚</div><div className="feature-title">Dicionário de Objeções</div><div className="feature-desc">Transcreve (Whisper), mapeia auto, alimenta dashboard das mais comuns e treina o Live Coach.</div></div>
            <div className="feature-card"><div className="feature-icon">📊</div><div className="feature-title">Call Intelligence</div><div className="feature-desc">Discovery auto, insights, performance coach: onde foi bem, onde melhorar e próximos passos.</div></div>
            <div className="feature-card"><div className="feature-icon">🧭</div><div className="feature-title">Pipeline & Coaching</div><div className="feature-desc">Kanban, health score, coaching longitudinal e training planner que fecha o loop vender → treinar → vender.</div></div>
            <div className="feature-card"><div className="feature-icon">💰</div><div className="feature-title">ROI Calculator</div><div className="feature-desc">3 cenários (conservador/base/otimista) por deal. Ancore preço no impacto e encurte ciclo.</div></div>
          </div>
        </div>
      </section>

      <section id="live" style={{background:"var(--surface)"}}>
        <div className="inner" style={{textAlign:"center"}}>
          <div className="section-label">02 / Ao Vivo</div>
          <h2 className="section-title" style={{marginLeft:"auto",marginRight:"auto"}}>Uma call,<br/>sem sair da plataforma</h2>
          <p className="section-desc" style={{marginLeft:"auto",marginRight:"auto",textAlign:"center"}}>Cole o link do Meet ou Zoom. Vídeo + coach lado a lado. Ao finalizar, o mesmo agente analisa e cria o plano de treino.</p>
          <div className="channel-grid">
            <div className="channel-card"><div className="channel-icon">🎥</div><div className="channel-name">Google Meet</div></div>
            <div className="channel-card"><div className="channel-icon">🔵</div><div className="channel-name">Zoom</div></div>
            <div className="channel-card"><div className="channel-icon">🎙️</div><div className="channel-name">Web Speech</div></div>
            <div className="channel-card"><div className="channel-icon">🤖</div><div className="channel-name">Whisper</div></div>
            <div className="channel-card"><div className="channel-icon">📝</div><div className="channel-name">Transcript</div></div>
            <div className="channel-card"><div className="channel-icon">🎯</div><div className="channel-name">Live Coach</div></div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="inner">
          <div className="section-label">03 / Planos</div>
          <h2 className="section-title">Comece grátis.<br/>Escale quando fechar mais.</h2>
          <p className="section-desc">Sem pegadinhas. Cancele quando quiser.</p>
          <div className="pricing-grid">
            <div className="pricing-card"><div className="pricing-tier">Starter</div><div className="pricing-name">Gratuito</div><div className="pricing-price">R$0<span>/mês</span></div><ul className="pricing-features"><li>2 closers</li><li>20 calls/mês</li><li>Live Coach + Roleplay L1-2</li><li>Suporte comunidade</li></ul><Link href="/register" className="btn-ghost" style={{textAlign:"center"}}>Começar agora</Link></div>
            <div className="pricing-card featured"><div className="pricing-tier">Mais popular</div><div className="pricing-name">Closer</div><div className="pricing-price">R$149<span>/mês</span></div><ul className="pricing-features"><li>5 closers</li><li>200 calls/mês</li><li>Meet/Zoom + Whisper</li><li>Dicionário ilimitado</li></ul><Link href="/register" className="btn-primary" style={{textAlign:"center",display:"block"}}>Iniciar teste</Link></div>
            <div className="pricing-card"><div className="pricing-tier">Scale</div><div className="pricing-name">Team</div><div className="pricing-price">R$399<span>/mês</span></div><ul className="pricing-features"><li>15 closers</li><li>1.000 calls/mês</li><li>Performance Coach IA</li><li>Suporte prioritário</li></ul><Link href="/register" className="btn-ghost" style={{textAlign:"center"}}>Iniciar teste</Link></div>
            <div className="pricing-card"><div className="pricing-tier">Enterprise</div><div className="pricing-name">Custom</div><div className="pricing-price">Sob consulta</div><ul className="pricing-features"><li>Unlimited closers</li><li>SSO / On-prem</li><li>Treinamento dedicado</li><li>SLA 99.9%</li></ul><a href="mailto:sales@closeros.com" className="btn-ghost" style={{textAlign:"center"}}>Falar com vendas</a></div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="inner">
          <div className="section-label">04 / Comece Agora</div>
          <h2 className="section-title" style={{marginLeft:"auto",marginRight:"auto",textAlign:"center"}}>Pronto para fechar mais?</h2>
          <p className="section-desc" style={{marginLeft:"auto",marginRight:"auto",textAlign:"center"}}>Junte-se aos times que transformam cada call em treino e cada treino em receita.</p>
          <div style={{textAlign:"center"}}><Link href={logged?"/live":"/register"} className="btn-primary" style={{fontSize:"16px",padding:"12px 32px"}}>{logged?"Abrir Live Coach →":"Comece grátis agora →"}</Link></div>
        </div>
      </section>

      <footer>
        <div className="inner">
          <div className="brand"><Link href="/" className="logo"><div className="logo-mark"><span>C</span></div><span className="logo-text">CLOSER OS</span></Link><p>AI Sales Operating System. Transcrição, live coach, roleplay e coaching — tudo em um só lugar.</p></div>
          <div><h4>Produto</h4><ul><li><a href="#features">Recursos</a></li><li><a href="#live">Live Coach</a></li><li><a href="/dashboard">App</a></li><li><a href="https://github.com/pixordigital/closer-os">GitHub</a></li></ul></div>
          <div><h4>Legal</h4><ul><li><a href="/legal/terms">Termos</a></li><li><a href="/legal/privacy">Privacidade</a></li></ul></div>
          <div><h4>Suporte</h4><ul><li><a href="mailto:support@closeros.com">support@closeros.com</a></li><li><a href="https://github.com/pixordigital/closer-os/issues">Reportar bug</a></li></ul></div>
        </div>
        <div className="bottom"><span>© 2026 Closer OS. Todos os direitos reservados.</span><span className="mono" style={{fontSize:"12px"}}>v0.1.0</span></div>
      </footer>
    </div>
  );
}

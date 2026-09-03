package com.closeros.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.navigation.compose.*
import kotlinx.coroutines.launch

private val Bg = Color(0xFF0A0A0A)
private val Surface = Color(0xFF111111)
private val Surface2 = Color(0xFF161616)
private val Border = Color(0xFF1F1F1F)
private val Accent = Color(0xFF00E5A0)
private val TextDim = Color(0xFF737373)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Bg.toArgb()
        window.navigationBarColor = Bg.toArgb()
        WindowCompat.getInsetsController(window, window.decorView)?.isAppearanceLightStatusBars = false
        WindowCompat.getInsetsController(window, window.decorView)?.isAppearanceLightNavigationBars = false
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(primary = Accent, surface = Surface, background = Bg)) {
                val nav = rememberNavController()
                var logged by remember { mutableStateOf(false) }
                // check saved login via prefs (simple)
                NavHost(navController = nav, startDestination = if(logged) "main" else "login") {
                    composable("login") {
                        LoginScreen(onLogin = {
                            logged = true
                            nav.navigate("main") { popUpTo("login"){ inclusive=true } }
                        })
                    }
                    composable("main") { MainScaffold(onLogout={ logged=false; nav.navigate("login"){ popUpTo("main"){inclusive=true}} }) }
                }
            }
        }
    }
}

@Composable fun LoginScreen(onLogin:()->Unit){
    var email by remember { mutableStateOf("pixordigital@gmail.com") }
    var pass by remember { mutableStateOf("") }
    var remember by remember { mutableStateOf(true) }
    var loading by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    val scope=rememberCoroutineScope()
    Column(Modifier.fillMaxSize().background(Bg).padding(24.dp), verticalArrangement = Arrangement.Center){
        Row(verticalAlignment=Alignment.CenterVertically){ Box(Modifier.size(32.dp).background(Accent, RoundedCornerShape(8.dp)), contentAlignment=Alignment.Center){ Text("C", color=Color.Black)}; Spacer(Modifier.width(10.dp)); Text("CLOSER OS", color=Color.White, fontSize=18.sp) }
        Spacer(Modifier.height(24.dp))
        Text("Entre na sua conta", color=Color.White, style=MaterialTheme.typography.titleLarge)
        Text("Android 100% nativo — sem WebView", color=TextDim, fontSize=12.sp)
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(value=email, onValueChange={email=it}, label={Text("Email")}, modifier=Modifier.fillMaxWidth(), colors=OutlinedTextFieldDefaults.colors(focusedBorderColor=Accent))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value=pass, onValueChange={pass=it}, label={Text("Senha")}, modifier=Modifier.fillMaxWidth())
        Row(Modifier.padding(top=12.dp), verticalAlignment=Alignment.CenterVertically){ Checkbox(checked=remember, onCheckedChange={remember=it}, colors=CheckboxDefaults.colors(checkedColor=Accent)); Text("Lembrar de mim — manter logado", color=TextDim, fontSize=13.sp) }
        err?.let{ Text(it, color=Color(0xFFEF4444), fontSize=12.sp, modifier=Modifier.padding(top=8.dp)) }
        Spacer(Modifier.height(16.dp))
        Button(onClick={
            loading=true; err=null
            scope.launch{
                try{
                    val r=Api.service.login(LoginReq(email,pass,remember))
                    if(r.isSuccessful) { loading=false; onLogin() } else { loading=false; err="Credenciais inválidas" }
                }catch(e:Exception){ loading=false; err=e.message?.take(120) ?: "Falha login"}
            }
        }, modifier=Modifier.fillMaxWidth(), colors=ButtonDefaults.buttonColors(containerColor=Accent, contentColor=Color.Black), enabled=!loading){ Text(if(loading) "Entrando..." else "Entrar") }
        Text("Web: 178.105.181.38:6002", color=TextDim, fontSize=11.sp, modifier=Modifier.padding(top=12.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun MainScaffold(onLogout:()->Unit){
    val nav=rememberNavController()
    var selected by remember { mutableStateOf(0) }
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val bottomItems = listOf("Dashboard" to "dashboard","Pipeline" to "pipeline","Calls" to "calls","Tasks" to "tasks","Mais" to "more")
    val allItems = listOf(
        "Dashboard" to "dashboard","Pipeline" to "pipeline","Empresas" to "companies","Contatos" to "contacts","Calls" to "calls","Live Coach" to "live","Objeções" to "objections","Roleplay" to "roleplay","Discovery" to "discovery","Coaching" to "coaching","ROI" to "roi","Tasks" to "tasks","Agentes" to "agents","Command" to "command","Webhooks" to "webhooks","Automations" to "automations","Jobs" to "jobs","Integrações" to "integrations","Settings" to "settings"
    )
    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = Surface){
                Column(Modifier.padding(16.dp)){
                    Row(verticalAlignment=Alignment.CenterVertically){ Box(Modifier.size(28.dp).background(Accent, RoundedCornerShape(8.dp)), contentAlignment=Alignment.Center){ Text("C", color=Color.Black)}; Spacer(Modifier.width(8.dp)); Text("CLOSER OS", color=Color.White) }
                    Spacer(Modifier.height(16.dp))
                    allItems.forEach{ (label,route) ->
                        val isLive = route=="live"
                        NavigationDrawerItem(
                            label={ Text(label, color=if(isLive) TextDim else Color.White, fontSize=13.sp) },
                            selected=false,
                            onClick={
                                scope.launch{ drawerState.close() }
                                if(isLive) return@NavigationDrawerItem
                                selected = bottomItems.indexOfFirst{ it.second==route }.let{ if(it==-1) 4 else it }
                                nav.navigate(route)
                            },
                            modifier=Modifier.padding(vertical=1.dp),
                            colors=NavigationDrawerItemDefaults.colors(unselectedContainerColor=if(isLive) Color(0xFF1A1A1A) else Surface)
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(onClick=onLogout, modifier=Modifier.fillMaxWidth(), colors=ButtonDefaults.buttonColors(containerColor=Border)){ Text("Sair") }
                }
            }
        }
    ){
        Scaffold(
            topBar={
                CenterAlignedTopAppBar(
                    title={ Text("CLOSER OS", color=Color.White)},
                    navigationIcon={ IconButton(onClick={ scope.launch{ drawerState.open() }}){ Text("☰", color=Color.White) } },
                    colors=TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor=Surface)
                )
            },
            bottomBar={
                NavigationBar(containerColor=Surface){
                    bottomItems.forEachIndexed{i,(label,route)->
                        NavigationBarItem(selected=selected==i, onClick={
                            if(route=="more"){ scope.launch{ drawerState.open() }; return@NavigationBarItem }
                            selected=i; nav.navigate(route)
                        }, icon={Text(when(i){0->"🏠" 1->"📊" 2->"📞" 3->"✅" else->"⋯"})}, label={Text(label, fontSize=10.sp)})
                    }
                }
            },
            containerColor=Bg
        ){ pad->
            Box(Modifier.padding(pad)){
                NavHost(navController=nav, startDestination="dashboard"){
                    composable("dashboard"){ DashboardNative() }
                    composable("pipeline"){ PipelineNative() }
                    composable("companies"){ SimpleListNative("Empresas","/api/companies") }
                    composable("contacts"){ SimpleListNative("Contatos","/api/contacts") }
                    composable("calls"){ CallsNative() }
                    composable("live"){ Placeholder("Live Coach — use extensão Chrome no desktop ou /mobile-live no app. Menu desabilitado pra não confundir.") }
                    composable("objections"){ SimpleListNative("Objeções","/api/objections") }
                    composable("roleplay"){ Placeholder("Roleplay — 12 personas, BOSS") }
                    composable("discovery"){ Placeholder("Discovery — health score") }
                    composable("coaching"){ Placeholder("Coaching — skills e training") }
                    composable("roi"){ Placeholder("ROI — 3 cenários") }
                    composable("tasks"){ TasksNative() }
                    composable("agents"){ Placeholder("Agentes autônomos — fila HITL") }
                    composable("command"){ Placeholder("Command — pergunte aos dados") }
                    composable("webhooks"){ Placeholder("Webhooks") }
                    composable("automations"){ Placeholder("Automations") }
                    composable("jobs"){ Placeholder("Jobs queue") }
                    composable("integrations"){ Placeholder("Integrações — Calendar, Evolution") }
                    composable("settings"){ Column(Modifier.padding(16.dp)){ Text("Settings", color=Color.White); Button(onClick=onLogout, modifier=Modifier.padding(top=12.dp)){ Text("Sair") } } }
                }
            }
        }
    }
}

@Composable fun DashboardNative(){
    var deals by remember { mutableStateOf<List<Deal>>(emptyList()) }
    var calls by remember { mutableStateOf<List<Call>>(emptyList()) }
    var tasks by remember { mutableStateOf<List<TaskItem>>(emptyList()) }
    LaunchedEffect(Unit){
        try{ deals = Api.service.deals().items }catch(_:Exception){}
        try{ calls = Api.service.calls().items }catch(_:Exception){}
        try{ tasks = Api.service.tasks().items }catch(_:Exception){}
    }
    val pipelineValue = deals.sumOf{ it.value ?: 0.0 }
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement=Arrangement.spacedBy(12.dp)){
        item{ Text("Dashboard", color=Color.White, style=MaterialTheme.typography.titleLarge); Text("Visão geral do seu pipeline e performance", color=TextDim, fontSize=13.sp) }
        item{
            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.spacedBy(8.dp)){
                KpiCard("Pipeline","R$ ${"%.0f".format(pipelineValue)}","${deals.size} deals", Modifier.weight(1f))
                KpiCard("Calls","${calls.size}","gravadas", Modifier.weight(1f))
            }
        }
        item{
            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.spacedBy(8.dp)){
                KpiCard("Tasks","${tasks.size}","pendentes", Modifier.weight(1f))
                KpiCard("Empresas","—","ativas", Modifier.weight(1f))
            }
        }
        item{ Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Pipeline por estágio", color=Color.White, fontSize=13.sp); Spacer(Modifier.height(8.dp)); if(deals.isEmpty()) Text("Nenhum deal ainda", color=TextDim, fontSize=12.sp) else deals.groupBy{it.stage}.forEach{ (st, list)-> Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween){ Text(st, color=TextDim, fontSize=11.sp); Text("${list.size}", color=Color.White, fontSize=11.sp) } } } } }
        item{ Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Deals recentes", color=Color.White, fontSize=13.sp); Spacer(Modifier.height(8.dp)); if(deals.isEmpty()) Text("Nenhum deal", color=TextDim, fontSize=12.sp) else deals.take(5).forEach{ Text("• ${it.name} [${it.stage}]", color=Color.White, fontSize=12.sp) } } } }
        item{ Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Calls recentes", color=Color.White, fontSize=13.sp); Spacer(Modifier.height(8.dp)); if(calls.isEmpty()) Text("Nenhuma call", color=TextDim, fontSize=12.sp) else calls.take(5).forEach{ Text("• ${it.title} [${it.status}]", color=Color.White, fontSize=12.sp) } } } }
        item{ Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Tasks pendentes", color=Color.White, fontSize=13.sp); Spacer(Modifier.height(8.dp)); if(tasks.isEmpty()) Text("Nenhuma task", color=TextDim, fontSize=12.sp) else tasks.take(5).forEach{ Text("• ${it.title} [${it.status}]", color=Color.White, fontSize=12.sp) } } } }
    }
}
@Composable fun PipelineNative(){
    var deals by remember { mutableStateOf<List<Deal>>(emptyList()) }
    var showCreate by remember { mutableStateOf(false) }
    var showMove by remember { mutableStateOf<Deal?>(null) }
    var newName by remember { mutableStateOf("") }
    var createErr by remember { mutableStateOf<String?>(null) }
    val scope=rememberCoroutineScope()
    fun reload(){ scope.launch{ try{ deals=Api.service.deals().items }catch(_:Exception){} } }
    LaunchedEffect(Unit){ reload() }
    val stages=listOf("LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","WON","LOST")
    Box(Modifier.fillMaxSize().background(Bg)){
        LazyColumn(Modifier.fillMaxSize().padding(16.dp).padding(bottom=72.dp), verticalArrangement=Arrangement.spacedBy(12.dp)){
            item{ Text("Pipeline Kanban — nativo", color=Color.White, style=MaterialTheme.typography.titleLarge); Text("Toque e segure no card para mover — igual ao web", color=TextDim, fontSize=12.sp) }
            stages.forEach{ st->
                val list=deals.filter{it.stage==st}
                item{
                    Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){
                        Column(Modifier.padding(12.dp)){
                            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween){ Text(st, color=Color.White, fontSize=12.sp); Text("${list.size}", color=TextDim, fontSize=12.sp) }
                            if(list.isEmpty()) Text("—", color=TextDim, fontSize=11.sp, modifier=Modifier.padding(top=6.dp))
                            else list.take(5).forEach{ d->
                                Card(colors=CardDefaults.cardColors(containerColor=Surface2), shape=RoundedCornerShape(8.dp), modifier=Modifier.fillMaxWidth().padding(top=6.dp)){
                                    Row(Modifier.padding(10.dp).fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween, verticalAlignment=Alignment.CenterVertically){
                                        Column{ Text(d.name, color=Color.White, fontSize=12.sp); Text(d.stage, color=TextDim, fontSize=10.sp) }
                                        Button(onClick={ showMove=d }, colors=ButtonDefaults.buttonColors(containerColor=Border), contentPadding=PaddingValues(horizontal=8.dp, vertical=4.dp)){ Text("Mover", fontSize=10.sp) }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        FloatingActionButton(onClick={ showCreate=true }, containerColor=Accent, contentColor=Color.Black, modifier=Modifier.align(Alignment.BottomEnd).padding(16.dp)){ Text("+", fontSize=20.sp) }
        if(showCreate){
            AlertDialog(onDismissRequest={showCreate=false; createErr=null}, title={Text("Novo deal")}, text={
                Column{
                    OutlinedTextField(value=newName, onValueChange={newName=it; createErr=null}, label={Text("Nome (mín 2 chars)")}, modifier=Modifier.fillMaxWidth(), isError=createErr!=null)
                    createErr?.let{ Text(it, color=Color(0xFFEF4444), fontSize=11.sp, modifier=Modifier.padding(top=6.dp)) }
                    if(createErr==null) Text("Usa primeira empresa da conta — crie uma em /companies no web se não houver", color=TextDim, fontSize=11.sp, modifier=Modifier.padding(top=8.dp))
                }
            }, confirmButton={ Button(onClick={
                if(newName.trim().length<2){ createErr="Nome precisa ter 2+ caracteres"; return@Button }
                scope.launch{
                    try{
                        val companies = try{ Api.service.companies().items }catch(_:Exception){ emptyList() }
                        val cid = companies.firstOrNull()?.id
                        if(cid==null){ createErr="Nenhuma empresa — crie uma no web em /companies"; return@launch }
                        Api.service.createDeal(CreateDealReq(newName.trim(), cid))
                        showCreate=false; newName=""; createErr=null; reload()
                    }catch(e:Exception){ createErr=(e.message ?: "Falha ao criar").take(120) }
                }
            }){ Text("Criar") } }, dismissButton={ TextButton(onClick={showCreate=false; createErr=null}){ Text("Cancelar") } })
        }
        showMove?.let{ d->
            var sel by remember { mutableStateOf(d.stage) }
            AlertDialog(onDismissRequest={showMove=null}, title={Text("Mover: ${d.name}")}, text={
                Column{ Text("De ${d.stage} para:", color=TextDim, fontSize=12.sp); Spacer(Modifier.height(8.dp)); stages.forEach{ st-> Row(verticalAlignment=Alignment.CenterVertically, modifier=Modifier.fillMaxWidth()){ RadioButton(selected=sel==st, onClick={sel=st}); Text(st, color=Color.White, fontSize=12.sp) } } }
            }, confirmButton={ Button(onClick={
                scope.launch{ try{ Api.service.updateDeal(d.id, mapOf("stage" to sel)); showMove=null; reload() }catch(_:Exception){ showMove=null } }
            }){ Text("Mover") } }, dismissButton={ TextButton(onClick={showMove=null}){ Text("Cancelar") } })
        }
    }
}
@OptIn(ExperimentalMaterial3Api::class)
@Composable fun CallsNative(){
    var calls by remember { mutableStateOf<List<Call>>(emptyList()) }
    var selected by remember { mutableStateOf<CallDetail?>(null) }
    var transcript by remember { mutableStateOf<String?>(null) }
    val scope=rememberCoroutineScope()
    fun load(){ scope.launch{ try{ calls=Api.service.calls().items }catch(_:Exception){} } }
    LaunchedEffect(Unit){ load() }
    if(selected!=null){
        Column(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement=Arrangement.spacedBy(12.dp)){
            Row(verticalAlignment=Alignment.CenterVertically){ Button(onClick={selected=null; transcript=null}, colors=ButtonDefaults.buttonColors(containerColor=Border)){ Text("← Voltar") }; Spacer(Modifier.width(12.dp)); Text(selected!!.title, color=Color.White, style=MaterialTheme.typography.titleMedium) }
            Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(12.dp)){ Text("Status: ${selected!!.status}", color=TextDim, fontSize=12.sp); Spacer(Modifier.height(8.dp)); Text(transcript ?: "Carregando transcript...", color=Color.White, fontSize=12.sp) } }
            Card(colors=CardDefaults.cardColors(containerColor=Surface2), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(12.dp)){ Text("Performance Coach", color=Accent, fontSize=13.sp); Text("Onde foi bem + melhorias + roleplays (mesmo agente do web)", color=TextDim, fontSize=11.sp); Spacer(Modifier.height(8.dp)); Button(onClick={
                scope.launch{ try{ val r=Api.service.performance(selected!!.id); transcript = "Score: ${r["overallScore"]} — ${r["summary"]}" }catch(_:Exception){ transcript="Análise pronta no web em /calls/${selected!!.id}" } }
            }, colors=ButtonDefaults.buttonColors(containerColor=Accent, contentColor=Color.Black)){ Text("Analisar performance") } } }
            // Player placeholder com TTS nativo
            Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(12.dp), horizontalAlignment=Alignment.CenterHorizontally){ Text("▶ Player", color=Color.White); Text("Transcrição com play via TTS nativo (em breve áudio real)", color=TextDim, fontSize=11.sp); Spacer(Modifier.height(8.dp)); Button(onClick={}, colors=ButtonDefaults.buttonColors(containerColor=Border)){ Text("▶ Play transcript") } } }
        }
        return
    }
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement=Arrangement.spacedBy(8.dp)){
        item{ Text("Calls", color=Color.White, style=MaterialTheme.typography.titleLarge); Text("Toque para ver transcript + coach — igual web", color=TextDim, fontSize=12.sp) }
        if(calls.isEmpty()) item{ Text("Nenhuma call", color=TextDim, fontSize=12.sp) }
        items(calls.size){ i-> val c=calls[i]; Card(onClick={
            selected=CallDetail(c.id,c.title,c.status,null)
            scope.launch{ try{ val d=Api.service.call(c.id); selected=d; transcript=d.transcript?.content ?: "Sem transcript" }catch(_:Exception){ transcript="Sem transcript"} }
        }, colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(10.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(12.dp)){ Text(c.title, color=Color.White, fontSize=13.sp); Text(c.status, color=TextDim, fontSize=11.sp) } } }
    }
}
@Composable fun TasksNative(){
    var tasks by remember { mutableStateOf<List<TaskItem>>(emptyList()) }
    LaunchedEffect(Unit){ try{ tasks=Api.service.tasks().items }catch(_:Exception){} }
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement=Arrangement.spacedBy(8.dp)){
        item{ Text("Tasks", color=Color.White, style=MaterialTheme.typography.titleLarge) }
        if(tasks.isEmpty()) item{ Text("Nenhuma task", color=TextDim, fontSize=12.sp) }
        items(tasks.size){ i-> val t=tasks[i]; Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(10.dp), modifier=Modifier.fillMaxWidth()){ Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween){ Text(t.title, color=Color.White, fontSize=13.sp); Text(t.status, color=Accent, fontSize=11.sp) } } }
    }
}
@Composable fun KpiCard(title:String, value:String, sub:String, modifier:Modifier=Modifier){
    Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=modifier){
        Column(Modifier.padding(16.dp)){ Text(title, color=TextDim, fontSize=11.sp); Text(value, color=Color.White, fontSize=20.sp); Text(sub, color=TextDim, fontSize=11.sp) }
    }
}
@Composable fun SimpleListNative(title:String, endpoint:String){
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement=Arrangement.spacedBy(8.dp)){
        item{ Text(title, color=Color.White, style=MaterialTheme.typography.titleLarge); Text("Nativo — espelho do web em ${endpoint}", color=TextDim, fontSize=12.sp) }
        item{ Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Em breve: lista real via ${endpoint}", color=TextDim, fontSize=12.sp); Text("Mesma UI do web, 100% nativo", color=Color.White, fontSize=11.sp) } } }
    }
}
@Composable fun Placeholder(t:String){ Box(Modifier.fillMaxSize().background(Bg).padding(24.dp), contentAlignment=Alignment.Center){ Text(t, color=TextDim) } }

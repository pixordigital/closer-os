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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    LaunchedEffect(Unit){
        try{ deals = Api.service.deals().items }catch(_:Exception){}
        try{ calls = Api.service.calls().items }catch(_:Exception){}
    }
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement=Arrangement.spacedBy(12.dp)){
        item{ Text("Dashboard", color=Color.White, style=MaterialTheme.typography.titleLarge); Text("Visão geral do seu pipeline — nativo", color=TextDim, fontSize=13.sp) }
        item{
            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.spacedBy(12.dp)){
                KpiCard("Pipeline","${deals.size} deals","total", Modifier.weight(1f))
                KpiCard("Calls","${calls.size}","gravadas", Modifier.weight(1f))
            }
        }
        item{ Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Pipeline por estágio", color=Color.White); Text(deals.groupBy{it.stage}.entries.joinToString(" • "){"${it.key} ${it.value.size}"}.ifEmpty{"Nenhum deal"}, color=TextDim, fontSize=12.sp, modifier=Modifier.padding(top=8.dp)) } } }
        item{ Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Deals recentes", color=Color.White); if(deals.isEmpty()) Text("Nenhum deal ainda", color=TextDim, fontSize=12.sp) else deals.take(5).forEach{ Text("• ${it.name} [${it.stage}]", color=Color.White, fontSize=12.sp) } } } }
        item{ Text("Portado do web: mesma paleta zinc-950, sem WebView", color=TextDim, fontSize=11.sp) }
    }
}
@Composable fun PipelineNative(){
    var deals by remember { mutableStateOf<List<Deal>>(emptyList()) }
    LaunchedEffect(Unit){ try{ deals=Api.service.deals().items }catch(_:Exception){} }
    val stages=listOf("LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","WON","LOST")
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement=Arrangement.spacedBy(12.dp)){
        item{ Text("Pipeline Kanban — nativo", color=Color.White, style=MaterialTheme.typography.titleLarge); Text("Mesmo pipeline do web, com health e drag (em breve)", color=TextDim, fontSize=12.sp) }
        stages.forEach{ st->
            val list=deals.filter{it.stage==st}
            item{
                Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){
                    Column(Modifier.padding(12.dp)){
                        Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.SpaceBetween){ Text(st, color=Color.White, fontSize=12.sp); Text("${list.size}", color=TextDim, fontSize=12.sp) }
                        if(list.isEmpty()) Text("—", color=TextDim, fontSize=11.sp, modifier=Modifier.padding(top=6.dp))
                        else list.take(3).forEach{ Text("• ${it.name}", color=Color.White, fontSize=11.sp, modifier=Modifier.padding(top=4.dp)) }
                    }
                }
            }
        }
    }
}
@Composable fun CallsNative(){
    var calls by remember { mutableStateOf<List<Call>>(emptyList()) }
    LaunchedEffect(Unit){ try{ calls=Api.service.calls().items }catch(_:Exception){} }
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement=Arrangement.spacedBy(8.dp)){
        item{ Text("Calls", color=Color.White, style=MaterialTheme.typography.titleLarge); Text("Transcrição + Live 30/70 no /mobile-live", color=TextDim, fontSize=12.sp) }
        if(calls.isEmpty()) item{ Text("Nenhuma call — crie no +", color=TextDim, fontSize=12.sp) }
        items(calls.size){ i-> val c=calls[i]; Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(10.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(12.dp)){ Text(c.title, color=Color.White, fontSize=13.sp); Text(c.status, color=TextDim, fontSize=11.sp) } } }
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

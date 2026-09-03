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
                try{ Api.service.login(LoginReq(email,pass,remember)); loading=false; onLogin() }catch(e:Exception){ loading=false; err=e.message?.take(120) ?: "Falha login"}
            }
        }, modifier=Modifier.fillMaxWidth(), colors=ButtonDefaults.buttonColors(containerColor=Accent, contentColor=Color.Black), enabled=!loading){ Text(if(loading) "Entrando..." else "Entrar") }
        Text("Web: 178.105.181.38:6002", color=TextDim, fontSize=11.sp, modifier=Modifier.padding(top=12.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun MainScaffold(onLogout:()->Unit){
    val nav=rememberNavController()
    var selected by remember { mutableStateOf(0) }
    val items=listOf("Dashboard" to "dashboard","Pipeline" to "pipeline","Calls" to "calls","Tasks" to "tasks","Settings" to "settings")
    Scaffold(
        topBar={ CenterAlignedTopAppBar(title={ Text("CLOSER OS", color=Color.White)} , colors=TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor=Surface)) },
        bottomBar={
            NavigationBar(containerColor=Surface){
                items.forEachIndexed{i,(label,route)->
                    NavigationBarItem(selected=selected==i, onClick={selected=i; nav.navigate(route)}, icon={Text(when(i){0->"🏠" 1->"📊" 2->"📞" 3->"✅" else->"⚙️"})}, label={Text(label, fontSize=10.sp)})
                }
            }
        },
        containerColor=Bg
    ){ pad->
        Box(Modifier.padding(pad)){
            NavHost(navController=nav, startDestination="dashboard"){
                composable("dashboard"){ DashboardNative() }
                composable("pipeline"){ Placeholder("Pipeline Kanban — nativo em breve") }
                composable("calls"){ Placeholder("Calls — nativo em breve (Live 30/70 já no /mobile-live)") }
                composable("tasks"){ Placeholder("Tasks — nativo em breve") }
                composable("settings"){ Column(Modifier.padding(16.dp)){ Text("Settings", color=Color.White); Button(onClick=onLogout, modifier=Modifier.padding(top=12.dp)){ Text("Sair") } } }
            }
        }
    }
}

@Composable fun DashboardNative(){
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement=Arrangement.spacedBy(12.dp)){
        item{ Text("Dashboard", color=Color.White, style=MaterialTheme.typography.titleLarge); Text("Visão geral do seu pipeline", color=TextDim, fontSize=13.sp) }
        item{
            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.spacedBy(12.dp)){
                KpiCard("Pipeline","R$ 0","0 deals", Modifier.weight(1f))
                KpiCard("Forecast","R$ 0","weighted", Modifier.weight(1f))
            }
        }
        item{
            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.spacedBy(12.dp)){
                KpiCard("Empresas","0","ativas", Modifier.weight(1f))
                KpiCard("Calls","0","gravadas", Modifier.weight(1f))
            }
        }
        item{ Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Pipeline por estágio", color=Color.White); Text("LEAD 0  •  QUALIFIED 0  •  DISCOVERY 0", color=TextDim, fontSize=12.sp, modifier=Modifier.padding(top=8.dp)) } } }
        item{ Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Deals recentes", color=Color.White); Text("Nenhum deal ainda — crie no +", color=TextDim, fontSize=12.sp) } } }
        item{ Text("Portado do web: mesma paleta zinc-950, cards zinc-900, borda zinc-800, sem WebView", color=TextDim, fontSize=11.sp) }
    }
}
@Composable fun KpiCard(title:String, value:String, sub:String, modifier:Modifier=Modifier){
    Card(colors=CardDefaults.cardColors(containerColor=Surface), shape=RoundedCornerShape(12.dp), modifier=modifier){
        Column(Modifier.padding(16.dp)){ Text(title, color=TextDim, fontSize=11.sp); Text(value, color=Color.White, fontSize=20.sp); Text(sub, color=TextDim, fontSize=11.sp) }
    }
}
@Composable fun Placeholder(t:String){ Box(Modifier.fillMaxSize().background(Bg).padding(24.dp), contentAlignment=Alignment.Center){ Text(t, color=TextDim) } }

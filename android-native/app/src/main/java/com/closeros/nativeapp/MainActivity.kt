package com.closeros.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.*
import com.closeros.nativeapp.ui.components.*
import com.closeros.nativeapp.ui.theme.*
import com.closeros.nativeapp.ui.viewmodel.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Bg.toArgb()
        window.navigationBarColor = Bg.toArgb()
        WindowCompat.getInsetsController(window, window.decorView)?.isAppearanceLightStatusBars = false
        WindowCompat.getInsetsController(window, window.decorView)?.isAppearanceLightNavigationBars = false
        setContent {
            CloserTheme {
                val nav = rememberNavController()
                var logged by remember { mutableStateOf(false) }
                NavHost(navController = nav, startDestination = if (logged) "main" else "login") {
                    composable("login") {
                        LoginScreen(onLogin = {
                            logged = true
                            nav.navigate("main") { popUpTo("login") { inclusive = true } }
                        })
                    }
                    composable("main") {
                        MainScaffold(onLogout = {
                            Api.clearSession()
                            logged = false
                            nav.navigate("login") { popUpTo("main") { inclusive = true } }
                        })
                    }
                }
            }
        }
    }
}

// ── Login ────────────────────────────────────────────────────────────────
@Composable
fun LoginScreen(onLogin: () -> Unit) {
    var email by remember { mutableStateOf("pixordigital@gmail.com") }
    var pass by remember { mutableStateOf("") }
    var rememberMe by remember { mutableStateOf(true) }
    var loading by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Column(
        Modifier.fillMaxSize().background(Bg).padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(36.dp).background(Accent, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                Text("C", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
            Spacer(Modifier.width(10.dp))
            Text("CLOSER OS", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        }
        Spacer(Modifier.height(28.dp))
        Text("Entre na sua conta", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        Text("Android 100% nativo — sem WebView", color = TextDim, fontSize = 12.sp)
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(
            value = email, onValueChange = { email = it }, label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Accent, focusedLabelColor = Accent,
                unfocusedBorderColor = BorderLight, unfocusedLabelColor = TextDim,
                focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary,
                cursorColor = Accent
            ), singleLine = true
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = pass, onValueChange = { pass = it }, label = { Text("Senha") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Accent, focusedLabelColor = Accent,
                unfocusedBorderColor = BorderLight, unfocusedLabelColor = TextDim,
                focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary,
                cursorColor = Accent
            ), singleLine = true
        )
        Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = rememberMe, onCheckedChange = { rememberMe = it }, colors = CheckboxDefaults.colors(checkedColor = Accent, checkmarkColor = Color.Black))
            Text("Lembrar de mim — manter logado", color = TextDim, fontSize = 13.sp)
        }
        err?.let { Text(it, color = ErrorRed, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp)) }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                loading = true; err = null
                scope.launch {
                    try {
                        val r = Api.service.login(LoginReq(email.trim(), pass, rememberMe))
                        if (r.isSuccessful) { loading = false; onLogin() } else { loading = false; err = "Credenciais inválidas" }
                    } catch (e: Exception) { loading = false; err = e.message?.take(140) ?: "Falha no login" }
                }
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color.Black),
            shape = RoundedCornerShape(12.dp), enabled = !loading
        ) { Text(if (loading) "Entrando..." else "Entrar", fontWeight = FontWeight.SemiBold) }
        Text("Web: 178.105.181.38:6002", color = TextDim, fontSize = 11.sp, modifier = Modifier.padding(top = 12.dp))
    }
}

// ── Nav items ───────────────────────────────────────────────────────────
private data class NavItem(val label: String, val route: String, val icon: ImageVector, val badge: Boolean = false)

private val bottomItems = listOf(
    NavItem("Hoje", "today", Icons.Filled.WbSunny),
    NavItem("Pipeline", "pipeline", Icons.Filled.ViewKanban),
    NavItem("Calls", "calls", Icons.Filled.Call),
    NavItem("Tasks", "tasks", Icons.Filled.CheckCircle),
    NavItem("Mais", "more", Icons.Filled.MoreHoriz),
)
private val drawerItems = listOf(
    NavItem("Hoje", "today", Icons.Filled.WbSunny),
    NavItem("Dashboard", "dashboard", Icons.Filled.Dashboard),
    NavItem("Pipeline", "pipeline", Icons.Filled.ViewKanban),
    NavItem("Empresas", "companies", Icons.Filled.Business),
    NavItem("Contatos", "contacts", Icons.Filled.Contacts),
    NavItem("Calls", "calls", Icons.Filled.Call),
    NavItem("Live Coach", "live", Icons.Outlined.Mic, badge = false),
    NavItem("Objeções", "objections", Icons.Filled.Psychology),
    NavItem("Roleplay", "roleplay", Icons.Filled.SportsEsports),
    NavItem("Discovery", "discovery", Icons.Filled.Search),
    NavItem("Coaching", "coaching", Icons.Filled.School),
    NavItem("ROI", "roi", Icons.Filled.AttachMoney),
    NavItem("Tasks", "tasks", Icons.Filled.CheckCircle),
    NavItem("Inbox", "inbox", Icons.Filled.Inbox),
    NavItem("Reports", "reports", Icons.Filled.BarChart),
    NavItem("Digest", "digest", Icons.Filled.Mail),
    NavItem("Import", "import", Icons.Filled.Upload),
    NavItem("Buscar", "search", Icons.Filled.Search),
    NavItem("Agentes", "agents", Icons.Filled.SmartToy),
    NavItem("Command", "command", Icons.Filled.Terminal),
    NavItem("Webhooks", "webhooks", Icons.Filled.Webhook),
    NavItem("Automations", "automations", Icons.Filled.AutoMode),
    NavItem("Jobs", "jobs", Icons.Filled.WorkHistory),
    NavItem("Integrações", "integrations", Icons.Filled.Link),
    NavItem("Settings", "settings", Icons.Filled.Settings),
)

// ── Scaffold ─────────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScaffold(onLogout: () -> Unit) {
    val nav = rememberNavController()
    var selected by remember { mutableIntStateOf(0) }
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val notifVm: NotificationsViewModel = viewModel()
    val notifs by notifVm.state.collectAsState()
    val notifTotal = notifs.total

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = Surface, modifier = Modifier.width(300.dp)) {
                LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp)) {
                            Box(Modifier.size(28.dp).background(Accent, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                                Text("C", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }
                            Spacer(Modifier.width(8.dp))
                            Text("CLOSER OS", color = TextPrimary, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                        }
                        if (notifTotal > 0) Text("$notifTotal alertas — veja Hoje", color = Accent, fontSize = 11.sp, modifier = Modifier.padding(bottom = 8.dp))
                        Divider(color = Border, modifier = Modifier.padding(vertical = 8.dp))
                    }
                    items(drawerItems) { item ->
                        val isDisabled = item.route == "live"
                        NavigationDrawerItem(
                            label = { Text(item.label, color = if (isDisabled) TextDim else TextPrimary, fontSize = 13.sp) },
                            icon = { Icon(item.icon, contentDescription = null, tint = if (isDisabled) TextDim else TextSecondary, modifier = Modifier.size(20.dp)) },
                            selected = false,
                            onClick = {
                                scope.launch { drawerState.close() }
                                if (isDisabled) return@NavigationDrawerItem
                                val bottomIdx = bottomItems.indexOfFirst { it.route == item.route }
                                selected = if (bottomIdx == -1) 4 else bottomIdx
                                nav.navigate(item.route) { launchSingleTop = true }
                            },
                            modifier = Modifier.padding(vertical = 1.dp),
                            colors = NavigationDrawerItemDefaults.colors(
                                unselectedContainerColor = if (isDisabled) Color(0xFF1A1A1A) else Surface,
                                selectedContainerColor = Surface2
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                    item {
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = onLogout, modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = TextSecondary),
                            shape = RoundedCornerShape(10.dp)
                        ) { Icon(Icons.AutoMirrored.Filled.Logout, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(8.dp)); Text("Sair") }
                        Spacer(Modifier.height(16.dp))
                    }
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = { Text("CLOSER OS", color = TextPrimary, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, fontSize = 15.sp) },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Filled.Menu, contentDescription = "Menu", tint = TextPrimary)
                        }
                    },
                    actions = {
                        if (notifTotal > 0) {
                            BadgedBox(badge = { Badge(containerColor = Accent, contentColor = Color.Black) { Text("$notifTotal", fontSize = 10.sp) } }) {
                                IconButton(onClick = { selected = 0; nav.navigate("today") { launchSingleTop = true } }) {
                                    Icon(Icons.Filled.Notifications, contentDescription = "Alertas", tint = TextPrimary)
                                }
                            }
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Surface)
                )
            },
            bottomBar = {
                NavigationBar(containerColor = Surface, tonalElevation = 0.dp) {
                    bottomItems.forEachIndexed { i, item ->
                        NavigationBarItem(
                            selected = selected == i,
                            onClick = {
                                if (item.route == "more") { scope.launch { drawerState.open() }; return@NavigationBarItem }
                                selected = i; nav.navigate(item.route) { launchSingleTop = true }
                            },
                            icon = { Icon(item.icon, contentDescription = item.label, modifier = Modifier.size(22.dp)) },
                            label = { Text(item.label, fontSize = 10.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Accent, selectedTextColor = TextPrimary,
                                unselectedIconColor = TextDim, unselectedTextColor = TextDim,
                                indicatorColor = Color(0xFF1E2A24)
                            )
                        )
                    }
                }
            },
            containerColor = Bg
        ) { pad ->
            Box(Modifier.padding(pad)) {
                NavHost(navController = nav, startDestination = "today") {
                    composable("today") { TodayScreen() }
                    composable("dashboard") { DashboardScreen() }
                    composable("pipeline") { PipelineScreen() }
                    composable("companies") { CompaniesScreen() }
                    composable("contacts") { SimpleListScreen("Contatos", "/api/contacts", "Lista real via /api/contacts — espelho web") }
                    composable("calls") { CallsScreen() }
                    composable("live") { PlaceholderScreen("Live Coach — use extensão Chrome no desktop ou /mobile-live. Menu desabilitado pra não confundir.") }
                    composable("objections") { SimpleListScreen("Objeções", "/api/objections", "Objeções por categoria — espelho web") }
                    composable("roleplay") { PlaceholderScreen("Roleplay — 12 personas, BOSS") }
                    composable("discovery") { PlaceholderScreen("Discovery — health score por deal") }
                    composable("coaching") { PlaceholderScreen("Coaching — skills e training") }
                    composable("roi") { PlaceholderScreen("ROI — 3 cenários") }
                    composable("tasks") { TasksScreen() }
                    composable("inbox") { InboxScreen() }
                    composable("reports") { ReportsScreen() }
                    composable("digest") { DigestScreen() }
                    composable("import") { ImportScreen() }
                    composable("search") { SearchScreen() }
                    composable("agents") { PlaceholderScreen("Agentes autônomos — fila HITL") }
                    composable("command") { SearchScreen() }
                    composable("webhooks") { PlaceholderScreen("Webhooks — endpoints e deliveries") }
                    composable("automations") { PlaceholderScreen("Automations — regras e runs") }
                    composable("jobs") { PlaceholderScreen("Jobs queue — AIJob status") }
                    composable("integrations") { PlaceholderScreen("Integrações — Calendar, Evolution, Email") }
                    composable("settings") {
                        Column(Modifier.fillMaxSize().background(Bg).padding(16.dp)) {
                            Text("Settings", color = TextPrimary, style = MaterialTheme.typography.titleLarge)
                            Spacer(Modifier.height(16.dp))
                            Button(onClick = onLogout, colors = ButtonDefaults.buttonColors(containerColor = ErrorRed)) { Text("Sair") }
                        }
                    }
                }
            }
        }
    }
}

// ── Today ────────────────────────────────────────────────────────────────
@Composable
fun TodayScreen(vm: TodayViewModel = viewModel()) {
    val st by vm.state.collectAsState()
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Hoje — My Day", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Atrasadas · Hoje · Sem next step · Paradas 7d · Calls hoje", color = TextDim, fontSize = 12.sp)
        }
        if (st.loading) { item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border) } }
        st.error?.let { item { Text(it, color = ErrorRed, fontSize = 12.sp) } }
        st.data?.let { d ->
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard("Atrasadas", "${d.counts.overdue}", "", Modifier.weight(1f))
                    KpiCard("Hoje", "${d.counts.dueToday}", "", Modifier.weight(1f))
                    KpiCard("Paradas", "${d.counts.stale}", "7d", Modifier.weight(1f))
                }
            }
            item {
                SectionCard(title = "Resumo Hoje") {
                    listOf("Atrasadas" to d.counts.overdue, "Hoje" to d.counts.dueToday, "Sem next step" to d.counts.noNextStep, "Paradas" to d.counts.stale, "Calls hoje" to d.counts.callsToday, "Follow-ups" to d.counts.pendingFollowUps, "Tasks TODO" to d.counts.tasksTodo)
                        .forEach { (k, v) -> RowLabelValue(k, "$v") }
                }
            }
            if (d.overdue.isNotEmpty()) item {
                SectionCard(title = "Atrasadas", subtitle = "${d.overdue.size} tasks") {
                    d.overdue.take(5).forEach { t -> Text("• ${t.title}${t.deal?.name?.let { " — $it" } ?: ""}", color = TextPrimary, fontSize = 11.sp, modifier = Modifier.padding(vertical = 2.dp)) }
                }
            }
            if (d.dueToday.isNotEmpty()) item {
                SectionCard(title = "Hoje", subtitle = "${d.dueToday.size} tasks") {
                    d.dueToday.take(5).forEach { t -> Text("• ${t.title}", color = TextPrimary, fontSize = 11.sp, modifier = Modifier.padding(vertical = 2.dp)) }
                }
            }
            if (d.noNextStep.isNotEmpty()) item {
                SectionCard(title = "Sem next step", subtitle = "${d.noNextStep.size} deals") {
                    d.noNextStep.take(5).forEach { deal -> Text("• ${deal.name} [${deal.stage}]", color = TextPrimary, fontSize = 11.sp, modifier = Modifier.padding(vertical = 2.dp)) }
                }
            }
            if (d.stale.isNotEmpty()) item {
                SectionCard(title = "Paradas 7d", subtitle = "${d.stale.size} deals") {
                    d.stale.take(5).forEach { deal -> Text("• ${deal.name} [${deal.stage}]", color = TextPrimary, fontSize = 11.sp, modifier = Modifier.padding(vertical = 2.dp)) }
                }
            }
            if (d.callsToday.isNotEmpty()) item {
                SectionCard(title = "Calls hoje", subtitle = "${d.callsToday.size}") {
                    d.callsToday.take(5).forEach { c -> Text("• ${c.title} [${c.status}]", color = TextPrimary, fontSize = 11.sp, modifier = Modifier.padding(vertical = 2.dp)) }
                }
            }
            if (d.pendingFollowUps.isNotEmpty()) item {
                SectionCard(title = "Follow-ups pendentes", subtitle = "${d.pendingFollowUps.size}") {
                    d.pendingFollowUps.take(5).forEach { f -> Text("• ${f.subject ?: f.type ?: f.id.take(8)} [${f.status ?: ""}]", color = TextPrimary, fontSize = 11.sp, modifier = Modifier.padding(vertical = 2.dp)) }
                }
            }
            if (d.overdue.isEmpty() && d.dueToday.isEmpty() && d.noNextStep.isEmpty() && d.stale.isEmpty() && d.callsToday.isEmpty()) {
                item { EmptyState("Nada pendente hoje 🎉", "Aproveite para prospectar ou revisar pipeline") }
            }
        }
    }
}

// ── Dashboard ────────────────────────────────────────────────────────────
@Composable
fun DashboardScreen(vm: DashboardViewModel = viewModel()) {
    val st by vm.state.collectAsState()
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Dashboard", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Visão geral do pipeline e performance", color = TextDim, fontSize = 13.sp)
        }
        if (st.loading) { item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border) } }
        st.error?.let { item { Text(it, color = ErrorRed, fontSize = 12.sp) } }
        st.data?.let { (deals, calls, tasks) ->
            val pipelineValue = deals.sumOf { it.value ?: 0.0 }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard("Pipeline", "R$ ${"%.0f".format(pipelineValue)}", "${deals.size} deals", Modifier.weight(1f))
                    KpiCard("Calls", "${calls.size}", "gravadas", Modifier.weight(1f))
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard("Tasks", "${tasks.size}", "pendentes", Modifier.weight(1f))
                    KpiCard("Deals", "${deals.size}", "ativos", Modifier.weight(1f))
                }
            }
            item {
                SectionCard(title = "Pipeline por estágio") {
                    if (deals.isEmpty()) Text("Nenhum deal ainda", color = TextDim, fontSize = 12.sp)
                    else deals.groupBy { it.stage }.entries.sortedBy { it.key }.forEach { (st, list) ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(st, color = TextDim, fontSize = 11.sp); Text("${list.size}", color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                        }
                        LinearProgressIndicator(progress = list.size / maxOf(1f, deals.size.toFloat()), modifier = Modifier.fillMaxWidth().height(3.dp), color = Accent, trackColor = Border)
                        Spacer(Modifier.height(6.dp))
                    }
                }
            }
            item {
                SectionCard(title = "Deals recentes") {
                    if (deals.isEmpty()) Text("Nenhum deal", color = TextDim, fontSize = 12.sp)
                    else deals.take(5).forEach { d ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(d.name, color = TextPrimary, fontSize = 12.sp, modifier = Modifier.weight(1f))
                            Chip(d.stage, color = Border, textColor = TextDim)
                        }
                        if (d != deals.take(5).last()) Divider(color = Border, modifier = Modifier.padding(vertical = 4.dp))
                    }
                }
            }
            item {
                SectionCard(title = "Calls recentes") {
                    if (calls.isEmpty()) Text("Nenhuma call", color = TextDim, fontSize = 12.sp)
                    else calls.take(5).forEach { c -> Text("• ${c.title} [${c.status}]", color = TextPrimary, fontSize = 12.sp, modifier = Modifier.padding(vertical = 2.dp)) }
                }
            }
            item {
                SectionCard(title = "Tasks pendentes") {
                    if (tasks.isEmpty()) Text("Nenhuma task", color = TextDim, fontSize = 12.sp)
                    else tasks.take(5).forEach { t ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(t.title, color = TextPrimary, fontSize = 12.sp, modifier = Modifier.weight(1f))
                            Chip(t.status, color = if (t.status == "TODO") Border else Color(0xFF1E2A24), textColor = if (t.status == "TODO") TextDim else Accent)
                        }
                    }
                }
            }
        }
    }
}

// ── Pipeline ─────────────────────────────────────────────────────────────
@Composable
fun PipelineScreen(vm: PipelineViewModel = viewModel()) {
    val st by vm.state.collectAsState()
    var showCreate by remember { mutableStateOf(false) }
    var showMove by remember { mutableStateOf<Deal?>(null) }
    var newName by remember { mutableStateOf("") }
    var createErr by remember { mutableStateOf<String?>(null) }
    val stages = listOf("LEAD", "QUALIFIED", "DISCOVERY", "SOLUTION", "PROPOSAL", "NEGOTIATION", "VERBAL_COMMITMENT", "WON", "LOST")
    Box(Modifier.fillMaxSize().background(Bg)) {
        LazyColumn(Modifier.fillMaxSize().padding(16.dp).padding(bottom = 72.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Text("Pipeline Kanban — nativo", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Toque em Mover para trocar estágio — igual ao web", color = TextDim, fontSize = 12.sp)
            }
            if (st.loading) { item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border) } }
            st.error?.let { item { Text(it, color = ErrorRed, fontSize = 12.sp) } }
            val deals = st.data ?: emptyList()
            stages.forEach { stName ->
                val list = deals.filter { it.stage == stName }
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(stName, color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.5.sp)
                                Surface(color = Border, shape = RoundedCornerShape(20.dp)) { Text("${list.size}", color = TextDim, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)) }
                            }
                            if (list.isEmpty()) Text("—", color = TextDim, fontSize = 11.sp, modifier = Modifier.padding(top = 8.dp))
                            else list.take(6).forEach { d ->
                                Card(colors = CardDefaults.cardColors(containerColor = Surface2), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                                    Row(Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Column(Modifier.weight(1f)) {
                                            Text(d.name, color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                            Text("${d.company?.name ?: ""} · ${d.stage}", color = TextDim, fontSize = 10.sp)
                                        }
                                        FilledTonalButton(
                                            onClick = { showMove = d },
                                            colors = ButtonDefaults.filledTonalButtonColors(containerColor = Border, contentColor = TextSecondary),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                        ) { Text("Mover", fontSize = 10.sp) }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        FloatingActionButton(onClick = { showCreate = true }, containerColor = Accent, contentColor = Color.Black, modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp), shape = RoundedCornerShape(16.dp)) {
            Icon(Icons.Filled.Add, contentDescription = "Novo deal")
        }
        if (showCreate) {
            AlertDialog(
                onDismissRequest = { showCreate = false; createErr = null },
                title = { Text("Novo deal", color = TextPrimary) },
                text = {
                    Column {
                        OutlinedTextField(
                            value = newName, onValueChange = { newName = it; createErr = null },
                            label = { Text("Nome (mín 2 chars)") }, modifier = Modifier.fillMaxWidth(), isError = createErr != null,
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = BorderLight, focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary)
                        )
                        createErr?.let { Text(it, color = ErrorRed, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp)) }
                        if (createErr == null) Text("Usa primeira empresa da conta — crie uma em /companies no web se não houver", color = TextDim, fontSize = 11.sp, modifier = Modifier.padding(top = 8.dp))
                    }
                },
                confirmButton = {
                    Button(onClick = {
                        vm.create(newName) { err -> if (err != null) createErr = err else { showCreate = false; newName = ""; createErr = null } }
                    }, colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color.Black)) { Text("Criar") }
                },
                dismissButton = { TextButton(onClick = { showCreate = false; createErr = null }) { Text("Cancelar", color = TextDim) } },
                containerColor = Surface2, shape = RoundedCornerShape(16.dp)
            )
        }
        showMove?.let { d ->
            var sel by remember { mutableStateOf(d.stage) }
            AlertDialog(
                onDismissRequest = { showMove = null },
                title = { Text("Mover: ${d.name}", color = TextPrimary, fontSize = 14.sp) },
                text = {
                    Column {
                        Text("De ${d.stage} para:", color = TextDim, fontSize = 12.sp)
                        Spacer(Modifier.height(8.dp))
                        stages.forEach { stName ->
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                                RadioButton(selected = sel == stName, onClick = { sel = stName }, colors = RadioButtonDefaults.colors(selectedColor = Accent))
                                Text(stName, color = TextPrimary, fontSize = 12.sp)
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(onClick = { vm.move(d.id, sel) { showMove = null } }, colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color.Black)) { Text("Mover") }
                },
                dismissButton = { TextButton(onClick = { showMove = null }) { Text("Cancelar", color = TextDim) } },
                containerColor = Surface2, shape = RoundedCornerShape(16.dp)
            )
        }
    }
}

// ── Calls ────────────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CallsScreen(vm: CallsViewModel = viewModel()) {
    val st by vm.state.collectAsState()
    val detail by vm.detail.collectAsState()
    if (detail.data != null || detail.loading) {
        val d = detail.data
        Column(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(onClick = { vm.clearDetail() }, colors = ButtonDefaults.outlinedButtonColors(contentColor = TextSecondary)) { Text("← Voltar") }
                Spacer(Modifier.width(12.dp))
                Text(d?.title ?: "Carregando...", color = TextPrimary, style = MaterialTheme.typography.titleMedium)
            }
            if (detail.loading) LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border)
            detail.error?.let { Text(it, color = ErrorRed, fontSize = 12.sp) }
            d?.let {
                SectionCard(title = "Status: ${it.status}") {
                    Text(it.transcript?.content ?: "Sem transcript", color = TextPrimary, fontSize = 12.sp)
                }
                SectionCard(title = "Performance Coach", subtitle = "Onde foi bem + melhorias + roleplays") {
                    Button(onClick = { vm.analyze(it.id) }, colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color.Black), shape = RoundedCornerShape(10.dp)) { Text("Analisar performance") }
                }
                SectionCard(title = "Player") {
                    Text("Transcrição com play via TTS nativo (em breve áudio real)", color = TextDim, fontSize = 11.sp)
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = {}, colors = ButtonDefaults.outlinedButtonColors(contentColor = TextSecondary)) { Text("▶ Play transcript") }
                }
            }
        }
        return
    }
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Text("Calls", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Toque para ver transcript + coach — igual web", color = TextDim, fontSize = 12.sp)
        }
        if (st.loading) { item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border) } }
        st.error?.let { item { Text(it, color = ErrorRed, fontSize = 12.sp) } }
        val calls = st.data ?: emptyList()
        if (calls.isEmpty() && !st.loading) { item { EmptyState("Nenhuma call", "Crie em /calls/new no web ou via API") } }
        items(calls) { c ->
            Card(
                onClick = { vm.open(c.id) },
                colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()
            ) {
                Row(Modifier.padding(14.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(c.title, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text("${c.status}${c.deal?.name?.let { " · $it" } ?: ""}", color = TextDim, fontSize = 11.sp)
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = TextDim, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

// ── Tasks ────────────────────────────────────────────────────────────────
@Composable
fun TasksScreen(vm: TasksViewModel = viewModel()) {
    val st by vm.state.collectAsState()
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Tasks", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        if (st.loading) { item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border) } }
        st.error?.let { item { Text(it, color = ErrorRed, fontSize = 12.sp) } }
        val tasks = st.data ?: emptyList()
        if (tasks.isEmpty() && !st.loading) { item { EmptyState("Nenhuma task", "Tasks aparecem aqui e em Hoje") } }
        items(tasks) { t ->
            Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(14.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(t.title, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        if (t.dueDate != null) Text("vence ${t.dueDate.take(10)}", color = TextDim, fontSize = 11.sp)
                    }
                    Chip(t.status, color = if (t.status == "DONE") Color(0xFF1E2A24) else Border, textColor = if (t.status == "DONE") Accent else TextDim)
                }
            }
        }
    }
}

// ── Reports ──────────────────────────────────────────────────────────────
@Composable
fun ReportsScreen(vm: ReportsViewModel = viewModel()) {
    val st by vm.state.collectAsState()
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Relatórios", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Funnel · Win rate · Ciclo médio · Por closer", color = TextDim, fontSize = 12.sp)
        }
        if (st.loading) { item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border) } }
        st.error?.let { item { Text(it, color = ErrorRed, fontSize = 12.sp) } }
        st.data?.let { d ->
            item {
                SectionCard(title = "Funil por estágio", subtitle = "${d.total} deals · ${d.won} ganhos · ${d.lost} perdidos") {
                    if (d.funnel.isEmpty()) Text("Sem dados", color = TextDim, fontSize = 11.sp)
                    else d.funnel.forEach { r ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(r.stage, color = TextDim, fontSize = 11.sp); Text("${r.count} · ${r.conv}%", color = TextPrimary, fontSize = 11.sp)
                        }
                        LinearProgressIndicator(progress = r.conv / 100f, modifier = Modifier.fillMaxWidth().height(4.dp).padding(vertical = 4.dp), color = Accent, trackColor = Border)
                    }
                }
            }
            item {
                SectionCard(title = "Métricas") {
                    RowLabelValue("Win rate", "${d.winRate}%")
                    Spacer(Modifier.height(6.dp))
                    RowLabelValue("Ciclo médio", d.avgCycleDays?.let { "${"%.0f".format(it)} dias" } ?: "—")
                    Spacer(Modifier.height(6.dp))
                    RowLabelValue("Forecast ponderado", "R$ ${"%.0f".format(d.forecastWeighted)}")
                    if (d.lostByReason.isNotEmpty()) {
                        Spacer(Modifier.height(10.dp)); Text("Motivo perda", color = TextDim, fontSize = 11.sp)
                        d.lostByReason.forEach { r -> RowLabelValue(r.reason.ifBlank { "—" }, "${r.count}") }
                    }
                }
            }
            if (!d.perCloser.isNullOrEmpty()) {
                item {
                    SectionCard(title = "Por closer") {
                        d.perCloser.forEach { c ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(Modifier.weight(1f)) { Text(c.name, color = TextPrimary, fontSize = 12.sp); Text(c.email, color = TextDim, fontSize = 10.sp) }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("${c.deals} deals · ${c.won} ganhos", color = TextDim, fontSize = 11.sp)
                                    Text("R$ ${c.forecast}", color = Accent, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                            if (c != d.perCloser.last()) Divider(color = Border, modifier = Modifier.padding(vertical = 6.dp))
                        }
                    }
                }
            }
        }
    }
}

// ── Digest ───────────────────────────────────────────────────────────────
@Composable
fun DigestScreen(vm: DigestViewModel = viewModel()) {
    val st by vm.state.collectAsState()
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Digest 08h", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Mesmo conteúdo do email 08h — no app", color = TextDim, fontSize = 12.sp)
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { vm.load() }, colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color.Black), shape = RoundedCornerShape(10.dp)) { Text("Atualizar") }
                if (st.loading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Accent, strokeWidth = 2.dp)
            }
        }
        st.error?.let { item { Text(it, color = ErrorRed, fontSize = 12.sp) } }
        st.data?.let { d ->
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard("Atrasadas", "${d.counts.overdue}", "", Modifier.weight(1f))
                    KpiCard("Hoje", "${d.counts.dueToday}", "", Modifier.weight(1f))
                    KpiCard("Paradas", "${d.counts.stale}", "", Modifier.weight(1f))
                }
            }
            item {
                SectionCard(title = "Digest") {
                    Text(d.text.ifBlank { "Sem conteúdo" }, color = TextPrimary, fontSize = 11.sp, lineHeight = 16.sp)
                }
            }
        }
    }
}

// ── Inbox ────────────────────────────────────────────────────────────────
@Composable
fun InboxScreen(vm: InboxViewModel = viewModel()) {
    val st by vm.state.collectAsState()
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Text("Inbox — Email 2 vias", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Provider: ${st.data?.provider ?: "—"}", color = TextDim, fontSize = 11.sp)
        }
        if (st.loading) { item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border) } }
        st.error?.let { item { Text(it, color = ErrorRed, fontSize = 12.sp) } }
        val items = st.data?.items ?: emptyList()
        if (items.isEmpty() && !st.loading && st.error == null) { item { EmptyState("Nenhum email — conecte Gmail em /integrations ou use mock", "Inbox espelha o provider configurado no web") } }
        items(items) { m ->
            Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Text(m.subject ?: "(sem assunto)", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    Text("${m.from ?: ""} · ${m.date?.take(16) ?: ""}", color = TextDim, fontSize = 11.sp)
                    if (!m.snippet.isNullOrBlank()) { Spacer(Modifier.height(6.dp)); Text(m.snippet, color = TextSecondary, fontSize = 11.sp) }
                }
            }
        }
    }
}

// ── Search ───────────────────────────────────────────────────────────────
@Composable
fun SearchScreen(vm: SearchViewModel = viewModel()) {
    var q by remember { mutableStateOf("") }
    val st by vm.state.collectAsState()
    Column(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Buscar — Command", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = q, onValueChange = { q = it }, label = { Text("Buscar deals, empresas...") },
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, focusedLabelColor = Accent, unfocusedBorderColor = BorderLight, focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary),
                singleLine = true
            )
            Button(onClick = { vm.search(q) }, colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color.Black), shape = RoundedCornerShape(12.dp)) { Text("Buscar") }
        }
        if (st.loading) LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border)
        st.error?.let { Text(it, color = ErrorRed, fontSize = 12.sp) }
        st.data?.let { r ->
            SectionCard(title = "Resultados", subtitle = "${r.items.size} itens") {
                if (r.items.isEmpty()) Text("Nenhum resultado para \"$q\"", color = TextDim, fontSize = 11.sp)
                else r.items.take(12).forEach { ch ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Chip(ch.kind, color = Border, textColor = TextDim); Spacer(Modifier.width(6.dp))
                                Text(ch.title, color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            }
                            Text(ch.text.take(140), color = TextDim, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                        }
                        Text("${"%.0f".format(ch.score * 100)}%", color = Accent, fontSize = 10.sp)
                    }
                    Divider(color = Border, modifier = Modifier.padding(vertical = 4.dp))
                }
            }
        }
    }
}

// ── Import ───────────────────────────────────────────────────────────────
@Composable
fun ImportScreen() {
    var result by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Import — Pipedrive / HubSpot", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Envia 1 linha de teste — no web use CSV completo em /companies", color = TextDim, fontSize = 11.sp)
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        loading = true; scope.launch {
                            try {
                                val r = Api.service.importPipedrive(mapOf("rows" to listOf(mapOf("companyName" to "Teste Pipedrive ${System.currentTimeMillis() % 1000}", "dealName" to "Deal Import Teste", "value" to 10000))))
                                result = "Pipedrive: $r"
                            } catch (e: Exception) { result = e.message } ; loading = false
                        }
                    }, enabled = !loading, colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color.Black), shape = RoundedCornerShape(10.dp)
                ) { Text("Pipedrive teste") }
                OutlinedButton(
                    onClick = {
                        loading = true; scope.launch {
                            try {
                                val r = Api.service.importHubspot(mapOf("rows" to listOf(mapOf("companyName" to "Teste HubSpot ${System.currentTimeMillis() % 1000}", "dealName" to "Deal HS Teste", "value" to 10000))))
                                result = "HubSpot: $r"
                            } catch (e: Exception) { result = e.message } ; loading = false
                        }
                    }, enabled = !loading, shape = RoundedCornerShape(10.dp)
                ) { Text("HubSpot teste") }
            }
        }
        if (loading) { item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border) } }
        result?.let { item { SectionCard(title = "Resultado") { Text(it.take(800), color = TextPrimary, fontSize = 11.sp) } } }
        item { Text("Bulk e Merge: use web /pipeline (bulk stage) e /companies (merge). Mobile só importa linha teste.", color = TextDim, fontSize = 11.sp) }
    }
}

// ── Companies (real list) ───────────────────────────────────────────────
@Composable
fun CompaniesScreen() {
    var items by remember { mutableStateOf<List<Company>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var err by remember { mutableStateOf<String?>(null) }
    var q by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    fun load(query: String = "") {
        loading = true; err = null
        scope.launch {
            when (val r = Api.safe { Api.service.companies(limit = 30, q = query.ifBlank { null }) }) {
                is ApiResult.Ok -> { items = r.data.items; loading = false }
                is ApiResult.Err -> { err = r.message; loading = false }
                is ApiResult.Ex -> { err = r.throwable.message; loading = false }
            }
        }
    }
    LaunchedEffect(Unit) { load() }
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Text("Empresas", color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = q, onValueChange = { q = it }, label = { Text("Buscar empresa") }, modifier = Modifier.weight(1f),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = BorderLight, focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary),
                    singleLine = true
                )
                Button(onClick = { load(q) }, colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color.Black), shape = RoundedCornerShape(12.dp)) { Text("Buscar") }
            }
        }
        if (loading) { item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Accent, trackColor = Border) } }
        err?.let { item { Text(it, color = ErrorRed, fontSize = 12.sp) } }
        if (items.isEmpty() && !loading && err == null) { item { EmptyState("Nenhuma empresa", "Importe via /companies no web ou use o botão Import") } }
        items(items) { c ->
            Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Text(c.name, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    Text(listOfNotNull(c.industry, c.website).joinToString(" · ").ifBlank { "—" }, color = TextDim, fontSize = 11.sp)
                    if (c._count != null) Text("${c._count.deals} deals · ${c._count.contacts} contatos", color = TextDim, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }
        }
    }
}

// ── Shared helpers ───────────────────────────────────────────────────────
@Composable
fun SimpleListScreen(title: String, endpoint: String, hint: String) {
    Column(Modifier.fillMaxSize().background(Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(title, color = TextPrimary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text("Nativo — $endpoint", color = TextDim, fontSize = 12.sp)
        SectionCard(title = hint) { Text("Em breve: lista real via $endpoint", color = TextDim, fontSize = 12.sp) }
    }
}

@Composable
fun PlaceholderScreen(t: String) {
    Box(Modifier.fillMaxSize().background(Bg).padding(24.dp), contentAlignment = Alignment.Center) {
        Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp)) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Filled.Construction, contentDescription = null, tint = TextDim, modifier = Modifier.size(32.dp))
                Spacer(Modifier.height(12.dp))
                Text(t, color = TextDim, fontSize = 13.sp)
            }
        }
    }
}

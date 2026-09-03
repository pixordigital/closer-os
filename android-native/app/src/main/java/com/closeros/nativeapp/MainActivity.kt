package com.closeros.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                val nav = rememberNavController()
                var logged by remember { mutableStateOf(false) }
                NavHost(navController = nav, startDestination = if(logged) "dashboard" else "login") {
                    composable("login") {
                        LoginScreen(onLogin = {
                            logged = true
                            nav.navigate("dashboard") { popUpTo("login") { inclusive = true } }
                        })
                    }
                    composable("dashboard") { DashboardScreen() }
                }
            }
        }
    }
}

@Composable fun LoginScreen(onLogin: ()->Unit){
    var email by remember { mutableStateOf("pixordigital@gmail.com") }
    var pass by remember { mutableStateOf("") }
    var remember by remember { mutableStateOf(true) }
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center){
        Text("Closer Native", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(8.dp))
        Text("Android 100% nativo — sem WebView", style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(value=email, onValueChange={email=it}, label={Text("Email")}, modifier=Modifier.fillMaxWidth())
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value=pass, onValueChange={pass=it}, label={Text("Senha")}, modifier=Modifier.fillMaxWidth())
        Row(Modifier.padding(top=12.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically){
            Checkbox(checked=remember, onCheckedChange={remember=it})
            Text("Lembrar de mim", style=MaterialTheme.typography.bodySmall)
        }
        Spacer(Modifier.height(16.dp))
        Button(onClick={ onLogin() }, modifier=Modifier.fillMaxWidth()){ Text("Entrar") }
        Text("API: http://178.105.181.38:6002/api/auth/login", style=MaterialTheme.typography.labelSmall, modifier=Modifier.padding(top=8.dp))
    }
}

@Composable fun DashboardScreen(){
    Column(Modifier.fillMaxSize().padding(16.dp)){
        Text("Dashboard — Nativo", style=MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(12.dp))
        Card(Modifier.fillMaxWidth()){ Column(Modifier.padding(16.dp)){ Text("Pipeline: R$ 0"); Text("Calls: 0"); Text("Tasks: 0") } }
        Spacer(Modifier.height(12.dp))
        Text("Próximo: Pipeline Kanban nativo + Live Coach com WebRTC", style=MaterialTheme.typography.bodySmall)
    }
}

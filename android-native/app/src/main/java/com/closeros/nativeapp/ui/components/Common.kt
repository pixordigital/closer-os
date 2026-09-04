package com.closeros.nativeapp.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.closeros.nativeapp.ui.theme.Border
import com.closeros.nativeapp.ui.theme.Surface
import com.closeros.nativeapp.ui.theme.TextDim
import com.closeros.nativeapp.ui.theme.TextPrimary
import com.closeros.nativeapp.ui.theme.TextSecondary

@Composable
fun KpiCard(title: String, value: String, sub: String, modifier: Modifier = Modifier) {
    Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp), modifier = modifier) {
        Column(Modifier.padding(16.dp)) {
            Text(title, color = TextDim, fontSize = 11.sp, letterSpacing = 0.5.sp)
            Spacer(Modifier.height(4.dp))
            Text(value, color = TextPrimary, fontSize = 22.sp, lineHeight = 22.sp)
            if (sub.isNotEmpty()) { Spacer(Modifier.height(2.dp)); Text(sub, color = TextDim, fontSize = 11.sp) }
        }
    }
}

@Composable
fun SectionCard(title: String, subtitle: String? = null, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(16.dp), modifier = modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(title, color = TextPrimary, fontSize = 14.sp)
            if (subtitle != null) { Spacer(Modifier.height(2.dp)); Text(subtitle, color = TextDim, fontSize = 11.sp) }
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
fun EmptyState(text: String, hint: String? = null, modifier: Modifier = Modifier) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF141414)), shape = RoundedCornerShape(12.dp), modifier = modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(text, color = TextSecondary, fontSize = 12.sp)
            if (hint != null) { Spacer(Modifier.height(4.dp)); Text(hint, color = TextDim, fontSize = 11.sp) }
        }
    }
}

@Composable
fun RowLabelValue(label: String, value: String, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = TextDim, fontSize = 11.sp)
        Text(value, color = TextPrimary, fontSize = 11.sp)
    }
}

@Composable
fun Chip(text: String, color: Color = Border, textColor: Color = TextSecondary) {
    Surface(color = color, shape = RoundedCornerShape(20.dp)) {
        Text(text, color = textColor, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
    }
}

package com.closeros.nativeapp.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val CloserScheme = darkColorScheme(
    primary = Accent,
    onPrimary = Color.Black,
    background = Bg,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = Surface2,
    outline = Border,
    error = ErrorRed,
    secondary = TextSecondary,
)

@Composable
fun CloserTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = CloserScheme, content = content)
}

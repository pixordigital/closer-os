package com.closeros.nativeapp.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.closeros.nativeapp.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

// ponytail: one file holds all VMs — YAGNI splitting per file until one VM outgrows

data class UiState<T>(val loading: Boolean = true, val data: T? = null, val error: String? = null)

class TodayViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState<TodayRes>())
    val state: StateFlow<UiState<TodayRes>> = _state
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = Api.safe { Api.service.today() }) {
                is ApiResult.Ok -> _state.value = UiState(loading = false, data = r.data)
                is ApiResult.Err -> _state.value = UiState(loading = false, error = "${r.code}: ${r.message}")
                is ApiResult.Ex -> _state.value = UiState(loading = false, error = r.throwable.message ?: "Falha")
            }
        }
    }
    init { load() }
}

class DashboardViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState<Triple<List<Deal>, List<Call>, List<TaskItem>>>())
    val state: StateFlow<UiState<Triple<List<Deal>, List<Call>, List<TaskItem>>>> = _state
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val deals = Api.service.deals(limit = 50).items
                val calls = try { Api.service.calls(limit = 20).items } catch (_: Exception) { emptyList() }
                val tasks = try { Api.service.tasks(limit = 20).items } catch (_: Exception) { emptyList() }
                _state.value = UiState(loading = false, data = Triple(deals, calls, tasks))
            } catch (e: Exception) {
                _state.value = UiState(loading = false, error = e.message ?: "Falha")
            }
        }
    }
    init { load() }
}

class PipelineViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState<List<Deal>>())
    val state: StateFlow<UiState<List<Deal>>> = _state
    var moveError: String? = null
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = Api.safe { Api.service.deals(limit = 100).items }) {
                is ApiResult.Ok -> _state.value = UiState(loading = false, data = r.data)
                is ApiResult.Err -> _state.value = UiState(loading = false, error = r.message)
                is ApiResult.Ex -> _state.value = UiState(loading = false, error = r.throwable.message)
            }
        }
    }
    fun create(name: String, onDone: (String?) -> Unit) {
        if (name.trim().length < 2) { onDone("Nome precisa ter 2+ caracteres"); return }
        viewModelScope.launch {
            try {
                val companies = try { Api.service.companies(limit = 20).items } catch (_: Exception) { emptyList() }
                val cid = companies.firstOrNull()?.id
                if (cid == null) { onDone("Nenhuma empresa — crie uma no web em /companies"); return@launch }
                Api.service.createDeal(CreateDealReq(name.trim(), cid))
                load(); onDone(null)
            } catch (e: Exception) { onDone(e.message?.take(160) ?: "Falha ao criar") }
        }
    }
    fun move(dealId: String, stage: String, onDone: () -> Unit) {
        viewModelScope.launch {
            try { Api.service.updateDeal(dealId, mapOf("stage" to stage)); load(); onDone() } catch (e: Exception) { moveError = e.message; onDone() }
        }
    }
    init { load() }
}

class CallsViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState<List<Call>>())
    val state: StateFlow<UiState<List<Call>>> = _state
    private val _detail = MutableStateFlow<UiState<CallDetail>>(UiState(loading = false))
    val detail: StateFlow<UiState<CallDetail>> = _detail
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = Api.safe { Api.service.calls(limit = 50).items }) {
                is ApiResult.Ok -> _state.value = UiState(loading = false, data = r.data)
                is ApiResult.Err -> _state.value = UiState(loading = false, error = r.message)
                is ApiResult.Ex -> _state.value = UiState(loading = false, error = r.throwable.message)
            }
        }
    }
    fun open(id: String) {
        _detail.value = UiState(loading = true)
        viewModelScope.launch {
            when (val r = Api.safe { Api.service.call(id) }) {
                is ApiResult.Ok -> _detail.value = UiState(loading = false, data = r.data)
                is ApiResult.Err -> _detail.value = UiState(loading = false, error = r.message)
                is ApiResult.Ex -> _detail.value = UiState(loading = false, error = r.throwable.message)
            }
        }
    }
    fun clearDetail() { _detail.value = UiState(loading = false) }
    fun analyze(id: String) {
        viewModelScope.launch {
            try { val r = Api.service.performance(id); _detail.value = _detail.value.copy(error = "Score: ${r["overallScore"] ?: "?"} — ${r["summary"] ?: r}") } catch (e: Exception) { _detail.value = _detail.value.copy(error = e.message) }
        }
    }
    init { load() }
}

class TasksViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState<List<TaskItem>>())
    val state: StateFlow<UiState<List<TaskItem>>> = _state
    fun load() {
        _state.value = _state.value.copy(loading = true)
        viewModelScope.launch {
            when (val r = Api.safe { Api.service.tasks(limit = 50).items }) {
                is ApiResult.Ok -> _state.value = UiState(loading = false, data = r.data)
                is ApiResult.Err -> _state.value = UiState(loading = false, error = r.message)
                is ApiResult.Ex -> _state.value = UiState(loading = false, error = r.throwable.message)
            }
        }
    }
    init { load() }
}

class ReportsViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState<ReportsRes>())
    val state: StateFlow<UiState<ReportsRes>> = _state
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = Api.safe { Api.service.reports() }) {
                is ApiResult.Ok -> _state.value = UiState(loading = false, data = r.data)
                is ApiResult.Err -> _state.value = UiState(loading = false, error = r.message)
                is ApiResult.Ex -> _state.value = UiState(loading = false, error = r.throwable.message)
            }
        }
    }
    init { load() }
}

class DigestViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState<DigestRes>())
    val state: StateFlow<UiState<DigestRes>> = _state
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = Api.safe { Api.service.digest() }) {
                is ApiResult.Ok -> _state.value = UiState(loading = false, data = r.data)
                is ApiResult.Err -> _state.value = UiState(loading = false, error = r.message)
                is ApiResult.Ex -> _state.value = UiState(loading = false, error = r.throwable.message)
            }
        }
    }
    init { load() }
}

class InboxViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState<InboxRes>())
    val state: StateFlow<UiState<InboxRes>> = _state
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = Api.safe { Api.service.inbox(20) }) {
                is ApiResult.Ok -> _state.value = UiState(loading = false, data = r.data)
                is ApiResult.Err -> _state.value = UiState(loading = false, error = r.message)
                is ApiResult.Ex -> _state.value = UiState(loading = false, error = r.throwable.message)
            }
        }
    }
    init { load() }
}

class SearchViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState<SearchRes>(loading = false))
    val state: StateFlow<UiState<SearchRes>> = _state
    fun search(q: String) {
        if (q.isBlank()) return
        _state.value = UiState(loading = true)
        viewModelScope.launch {
            when (val r = Api.safe { Api.service.search(q, limit = 20) }) {
                is ApiResult.Ok -> _state.value = UiState(loading = false, data = r.data)
                is ApiResult.Err -> _state.value = UiState(loading = false, error = r.message)
                is ApiResult.Ex -> _state.value = UiState(loading = false, error = r.throwable.message)
            }
        }
    }
}

class NotificationsViewModel : ViewModel() {
    private val _state = MutableStateFlow(NotificationsRes())
    val state: StateFlow<NotificationsRes> = _state
    fun load() { viewModelScope.launch { try { _state.value = Api.service.notifications() } catch (_: Exception) {} } }
    init { load() }
}

package com.closeros.nativeapp

import com.closeros.nativeapp.BuildConfig
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

// ── Auth ───────────────────────────────────────────────────────────────
data class LoginReq(val email: String, val password: String, val remember: Boolean = true)
data class LoginRes(val ok: Boolean)

// ── Shared refs ────────────────────────────────────────────────────────
data class RefIdName(val id: String, val name: String)
data class CompanyCount(val deals: Int = 0, val contacts: Int = 0)
data class CountVal(val action: Int = 0, val stage: Int = 0, val lostReason: Int = 0, val ownerId: Int = 0)

// ── Deals ──────────────────────────────────────────────────────────────
data class Deal(
    val id: String,
    val name: String,
    val stage: String,
    val value: Double? = null,
    val currency: String? = null,
    val probability: Int? = null,
    val expectedCloseDate: String? = null,
    val nextStep: String? = null,
    val nextStepDate: String? = null,
    val ownerId: String? = null,
    val company: RefIdName? = null,
    val primaryContact: RefIdName? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)
data class DealsRes(val items: List<Deal> = emptyList(), val total: Int = 0, val page: Int = 1, val limit: Int = 20)
data class CreateDealReq(val name: String, val companyId: String, val stage: String = "LEAD", val value: Double? = null, val currency: String? = null)

// ── Calls ──────────────────────────────────────────────────────────────
data class Call(
    val id: String,
    val title: String,
    val status: String,
    val scheduledAt: String? = null,
    val deal: RefIdName? = null,
    val transcript: Transcript? = null,
)
data class CallsRes(val items: List<Call> = emptyList(), val total: Int = 0, val page: Int = 1, val limit: Int = 20)
data class CallDetail(val id: String, val title: String, val status: String, val scheduledAt: String? = null, val deal: RefIdName? = null, val transcript: Transcript? = null)
data class Transcript(val content: String? = null, val language: String? = null, val id: String? = null)
data class PerformanceRes(val overallScore: Int? = null, val summary: String? = null, val strengths: List<String>? = null, val improvements: List<String>? = null)

// ── Tasks ──────────────────────────────────────────────────────────────
data class TaskItem(val id: String, val title: String, val status: String, val dueDate: String? = null, val deal: RefIdName? = null, val description: String? = null)
data class TasksRes(val items: List<TaskItem> = emptyList(), val total: Int = 0, val page: Int = 1, val limit: Int = 20)

// ── Companies ──────────────────────────────────────────────────────────
data class Company(val id: String, val name: String, val website: String? = null, val industry: String? = null, val cnpj: String? = null, val _count: CompanyCount? = null)
data class CompaniesRes(val items: List<Company> = emptyList(), val total: Int = 0, val page: Int = 1, val limit: Int = 20)
data class TimelineItem(val type: String, val date: String, val title: String, val href: String, val meta: String? = null)
data class TimelineCounts(val deals: Int = 0, val calls: Int = 0, val tasks: Int = 0, val followUps: Int = 0)
data class TimelineRes(val items: List<TimelineItem> = emptyList(), val counts: TimelineCounts = TimelineCounts())

// ── Import ─────────────────────────────────────────────────────────────
data class ImportRes(val companiesCreated: Int = 0, val dealsCreated: Int = 0, val contactsCreated: Int = 0, val skipped: Int = 0, val created: Int? = null, val errors: List<Map<String, String>>? = null)

// ── Today ──────────────────────────────────────────────────────────────
data class TodayCounts(val overdue: Int = 0, val dueToday: Int = 0, val noNextStep: Int = 0, val stale: Int = 0, val callsToday: Int = 0, val pendingFollowUps: Int = 0, val tasksTodo: Int = 0)
data class FollowUpItem(val id: String, val subject: String? = null, val type: String? = null, val status: String? = null, val deal: RefIdName? = null, val createdAt: String? = null)
data class TodayRes(
    val overdue: List<TaskItem> = emptyList(),
    val dueToday: List<TaskItem> = emptyList(),
    val noNextStep: List<Deal> = emptyList(),
    val stale: List<Deal> = emptyList(),
    val callsToday: List<Call> = emptyList(),
    val pendingFollowUps: List<FollowUpItem> = emptyList(),
    val counts: TodayCounts = TodayCounts(),
)

// ── Notifications ──────────────────────────────────────────────────────
data class NotificationsRes(val overdue: Int = 0, val dueToday: Int = 0, val noNextStep: Int = 0, val stale: Int = 0, val pendingFollowUps: Int = 0, val total: Int = 0, val hasAlerts: Boolean = false)

// ── Reports ────────────────────────────────────────────────────────────
data class FunnelItem(val stage: String, val count: Int = 0, val value: Double = 0.0, val conv: Int = 0)
data class LostReasonRow(val reason: String, val count: Int = 0)
data class ActivityStat(val action: String, val _count: CountVal = CountVal())
data class PerCloserRow(val ownerId: String, val name: String, val email: String, val deals: Int = 0, val won: Int = 0, val forecast: Int = 0)
data class ReportsRes(
    val funnel: List<FunnelItem> = emptyList(),
    val total: Int = 0,
    val won: Int = 0,
    val lost: Int = 0,
    val winRate: Int = 0,
    val avgCycleDays: Double? = null,
    val lostByReason: List<LostReasonRow> = emptyList(),
    val activities: List<ActivityStat> = emptyList(),
    val forecastWeighted: Double = 0.0,
    val perCloser: List<PerCloserRow>? = null,
    val ownerId: String? = null,
)

// ── Digest ─────────────────────────────────────────────────────────────
data class DigestCounts(val overdue: Int = 0, val dueToday: Int = 0, val noNextStep: Int = 0, val stale: Int = 0, val callsToday: Int = 0)
data class DigestRes(val text: String = "", val html: String = "", val counts: DigestCounts = DigestCounts())

// ── Inbox / Search ─────────────────────────────────────────────────────
data class InboxItem(val subject: String? = null, val from: String? = null, val date: String? = null, val snippet: String? = null, val id: String? = null)
data class InboxRes(val items: List<InboxItem> = emptyList(), val provider: String = "", val note: String? = null)
data class SearchChunk(val id: String, val kind: String, val title: String, val text: String, val href: String, val score: Double = 0.0, val createdAt: String? = null)
data class SearchRes(val items: List<SearchChunk> = emptyList())

// ── Result wrapper ─────────────────────────────────────────────────────
sealed class ApiResult<out T> {
    data class Ok<T>(val data: T) : ApiResult<T>()
    data class Err(val code: Int, val message: String) : ApiResult<Nothing>()
    data class Ex(val throwable: Throwable) : ApiResult<Nothing>()
}

// ── Service ────────────────────────────────────────────────────────────
interface ApiService {
    @POST("api/auth/login") suspend fun login(@Body b: LoginReq): retrofit2.Response<LoginRes>

    @GET("api/deals") suspend fun deals(
        @Query("page") page: Int? = null, @Query("limit") limit: Int? = null,
        @Query("q") q: String? = null, @Query("stage") stage: String? = null,
        @Query("companyId") companyId: String? = null, @Query("mine") mine: String? = null,
    ): DealsRes
    @POST("api/deals") suspend fun createDeal(@Body b: CreateDealReq): Deal
    @PATCH("api/deals/{id}") suspend fun updateDeal(@Path("id") id: String, @Body b: Map<String, String>): Deal
    @POST("api/deals/bulk") suspend fun bulkDeals(@Body b: Map<String, Any>): Map<String, Any>

    @GET("api/calls") suspend fun calls(@Query("page") page: Int? = null, @Query("limit") limit: Int? = null, @Query("status") status: String? = null, @Query("dealId") dealId: String? = null, @Query("q") q: String? = null): CallsRes
    @GET("api/calls/{id}") suspend fun call(@Path("id") id: String): CallDetail
    @POST("api/calls") suspend fun createCall(@Body b: Map<String, String?>): Call
    @POST("api/calls/{id}/performance") suspend fun performance(@Path("id") id: String): Map<String, Any>

    @GET("api/tasks") suspend fun tasks(@Query("page") page: Int? = null, @Query("limit") limit: Int? = null, @Query("status") status: String? = null, @Query("dealId") dealId: String? = null, @Query("due") due: String? = null, @Query("q") q: String? = null): TasksRes
    @POST("api/tasks") suspend fun createTask(@Body b: Map<String, String?>): TaskItem

    @GET("api/companies") suspend fun companies(@Query("page") page: Int? = null, @Query("limit") limit: Int? = null, @Query("q") q: String? = null): CompaniesRes
    @GET("api/companies/{id}/timeline") suspend fun timeline(@Path("id") id: String): TimelineRes
    @POST("api/companies/merge") suspend fun mergeCompanies(@Body b: Map<String, String>): Map<String, Any>

    @POST("api/import/pipedrive") suspend fun importPipedrive(@Body b: Map<String, Any>): ImportRes
    @POST("api/import/hubspot") suspend fun importHubspot(@Body b: Map<String, Any>): ImportRes

    @GET("api/today") suspend fun today(): TodayRes
    @GET("api/notifications") suspend fun notifications(): NotificationsRes
    @GET("api/reports") suspend fun reports(@Query("mine") mine: String? = null, @Query("ownerId") ownerId: String? = null): ReportsRes
    @GET("api/digest") suspend fun digest(): DigestRes
    @POST("api/email/send") suspend fun sendEmail(@Body b: Map<String, String?>): Map<String, Any>
    @GET("api/email/inbox") suspend fun inbox(@Query("max") max: Int? = null): InboxRes
    @GET("api/search") suspend fun search(@Query("q") q: String, @Query("limit") limit: Int? = null): SearchRes
}

// ── Cookie jar — ponytail: in-memory map keyed by host; persiste enquanto app vivo.
// Se precisar sobreviver a kill, trocar por DataStore/SharedPreferences jar.
private class MemoryCookieJar : CookieJar {
    private val store = mutableMapOf<String, List<Cookie>>()
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        if (cookies.isNotEmpty()) store[url.host] = cookies
    }
    override fun loadForRequest(url: HttpUrl): List<Cookie> = store[url.host] ?: emptyList()
    fun clear() { store.clear() }
}

object Api {
    // ponytail: BASE vêm de BuildConfig (build.gradle buildConfigField), não hardcoded duplicado
    private const val BASE_FALLBACK = "http://178.105.181.38:6002/"
    private val base: String get() = try { BuildConfig.BASE_URL } catch (_: Exception) { BASE_FALLBACK }

    private val jar = MemoryCookieJar()

    private val client: OkHttpClient by lazy {
        val log = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
        OkHttpClient.Builder()
            .cookieJar(jar)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(log)
            .addInterceptor { chain ->
                val req = chain.request().newBuilder()
                    .header("Accept", "application/json")
                    .build()
                chain.proceed(req)
            }
            .build()
    }

    val service: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(base)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    fun clearSession() = jar.clear()

    // helper p/ chamar com Result sem repetir try/catch em cada ViewModel
    suspend fun <T> safe(call: suspend () -> T): ApiResult<T> = try {
        ApiResult.Ok(call())
    } catch (e: retrofit2.HttpException) {
        ApiResult.Err(e.code(), e.message() ?: "HTTP ${e.code()}")
    } catch (e: Exception) {
        ApiResult.Ex(e)
    }
}

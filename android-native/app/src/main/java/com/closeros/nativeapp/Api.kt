package com.closeros.nativeapp

import retrofit2.http.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import okhttp3.OkHttpClient

data class LoginReq(val email:String, val password:String, val remember:Boolean=true)
data class LoginRes(val ok:Boolean)
data class DealsRes(val items:List<Deal>, val total:Int)
data class Deal(val id:String, val name:String, val stage:String, val value:Double?, val currency:String?)
data class CallsRes(val items:List<Call>, val total:Int)
data class Call(val id:String, val title:String, val status:String)
data class TasksRes(val items:List<TaskItem>, val total:Int)
data class TaskItem(val id:String, val title:String, val status:String)
data class CompaniesRes(val items:List<Company>, val total:Int)
data class Company(val id:String, val name:String)

data class CreateDealReq(val name:String, val companyId:String, val stage:String="LEAD")
data class CallDetail(val id:String, val title:String, val status:String, val transcript:Transcript? = null)
data class Transcript(val content:String?, val language:String?)
interface ApiService {
    @POST("api/auth/login") suspend fun login(@Body b:LoginReq): retrofit2.Response<LoginRes>
    @GET("api/deals") suspend fun deals(): DealsRes
    @POST("api/deals") suspend fun createDeal(@Body b:CreateDealReq): Deal
    @PATCH("api/deals/{id}") suspend fun updateDeal(@Path("id") id:String, @Body b:Map<String,String>): Deal
    @POST("api/deals/bulk") suspend fun bulkDeals(@Body b:Map<String,Any>): Map<String,Any>
    @GET("api/calls") suspend fun calls(): CallsRes
    @GET("api/calls/{id}") suspend fun call(@Path("id") id:String): CallDetail
    @POST("api/calls") suspend fun createCall(@Body b:Map<String,String>): Call
    @POST("api/calls/{id}/performance") suspend fun performance(@Path("id") id:String): Map<String,Any>
    @GET("api/tasks") suspend fun tasks(): TasksRes
    @POST("api/tasks") suspend fun createTask(@Body b:Map<String,String?>): TaskItem
    @GET("api/companies") suspend fun companies(): CompaniesRes
    @GET("api/companies/{id}/timeline") suspend fun timeline(@Path("id") id:String): Map<String,Any>
    @POST("api/companies/merge") suspend fun mergeCompanies(@Body b:Map<String,String>): Map<String,Any>
    @POST("api/import/pipedrive") suspend fun importPipedrive(@Body b:Map<String,Any>): Map<String,Any>
    @POST("api/import/hubspot") suspend fun importHubspot(@Body b:Map<String,Any>): Map<String,Any>
    @GET("api/today") suspend fun today(): Map<String,Any>
    @GET("api/notifications") suspend fun notifications(): Map<String,Any>
    @GET("api/reports") suspend fun reports(): Map<String,Any>
    @GET("api/digest") suspend fun digest(): Map<String,Any>
    @POST("api/email/send") suspend fun sendEmail(@Body b:Map<String,String?>): Map<String,Any>
    @GET("api/email/inbox") suspend fun inbox(): Map<String,Any>
    @GET("api/search") suspend fun search(@Query("q") q:String): Map<String,Any>
}

object Api {
    private const val BASE = "http://178.105.181.38:6002/"
    private var cookie: String? = null
    fun setCookie(c:String){ cookie=c }
    val service: ApiService by lazy {
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            var b = chain.request().newBuilder().header("Content-Type","application/json")
            cookie?.let{ b.header("Cookie", it) }
            val resp = chain.proceed(b.build())
            resp.header("Set-Cookie")?.let{ setCookie(it.split(";")[0]) }
            resp
        }.cookieJar(object: okhttp3.CookieJar{
            override fun saveFromResponse(url: okhttp3.HttpUrl, cookies: List<okhttp3.Cookie>){ if(cookies.isNotEmpty()) cookie=cookies.joinToString(";"){it.toString().split(";")[0]} }
            override fun loadForRequest(url: okhttp3.HttpUrl): List<okhttp3.Cookie> = emptyList()
        }).build()
        Retrofit.Builder().baseUrl(BASE).client(client).addConverterFactory(GsonConverterFactory.create()).build().create(ApiService::class.java)
    }
}

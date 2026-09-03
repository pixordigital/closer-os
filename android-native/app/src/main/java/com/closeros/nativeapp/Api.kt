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

interface ApiService {
    @POST("api/auth/login") suspend fun login(@Body b:LoginReq): retrofit2.Response<LoginRes>
    @GET("api/deals") suspend fun deals(): DealsRes
    @GET("api/calls") suspend fun calls(): CallsRes
    @GET("api/tasks") suspend fun tasks(): TasksRes
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

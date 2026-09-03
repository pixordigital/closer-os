package com.closeros.nativeapp

import retrofit2.http.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import okhttp3.OkHttpClient

data class LoginReq(val email:String, val password:String, val remember:Boolean=true)
data class LoginRes(val ok:Boolean)
data class CountRes(val total:Int)
data class Deal(val id:String, val name:String, val stage:String, val value:Double?, val currency:String?)
data class Call(val id:String, val title:String, val status:String)

interface ApiService {
    @POST("api/auth/login") suspend fun login(@Body b:LoginReq): LoginRes
    @GET("api/deals") suspend fun deals(): Map<String,Any>
    @GET("api/companies") suspend fun companies(): Map<String,Any>
    @GET("api/calls") suspend fun calls(): Map<String,Any>
}

object Api {
    private const val BASE = "http://178.105.181.38:6002/"
    val service: ApiService by lazy {
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            val req = chain.request().newBuilder().header("Content-Type","application/json").build()
            chain.proceed(req)
        }.build()
        Retrofit.Builder().baseUrl(BASE).client(client).addConverterFactory(GsonConverterFactory.create()).build().create(ApiService::class.java)
    }
}

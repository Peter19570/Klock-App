package com.example.klockapp.config.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

//@Component
//@Order(Ordered.HIGHEST_PRECEDENCE)
public class SimpleCORSFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

//    @Override
//    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
//        HttpServletResponse response = (HttpServletResponse) res;
//        HttpServletRequest request = (HttpServletRequest) req;
//
//        String origin = request.getHeader("Origin");
//
//        // System.out.println("=== CORS FILTER DEBUG ===");
//        // System.out.println("Origin: " + origin);
//        // System.out.println("Method: " + request.getMethod());
//        // System.out.println("Request URI: " + request.getRequestURI());
//        // System.out.println("Remote Address: " + request.getRemoteAddr());
//        // System.out.println("Remote Host: " + request.getRemoteHost());
//
//        // Always set CORS headers regardless of origin
//        if (origin != null && !origin.isEmpty()) {
//            response.setHeader("Access-Control-Allow-Origin", origin);
//        } else {
//            response.setHeader("Access-Control-Allow-Origin", "*");
//        }
//
//        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
//        response.setHeader("Access-Control-Allow-Headers", "*");
//        response.setHeader("Access-Control-Allow-Credentials", "true");
//        response.setHeader("Access-Control-Max-Age", "3600");
//        response.setHeader("Access-Control-Expose-Headers", "*");
//        response.setHeader("Vary", "Origin");
//
//        // Handle preflight requests
//        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
//            // System.out.println("Handling OPTIONS preflight request");
//            response.setStatus(HttpServletResponse.SC_OK);
//            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
//            response.setHeader("Access-Control-Allow-Headers", "*");
//            response.setHeader("Access-Control-Max-Age", "3600");
//            response.getWriter().flush();
//            return;
//        }
//
//        try {
//            chain.doFilter(req, res);
//            // System.out.println("Request completed successfully");
//        } catch (Exception e) {
//            System.err.println("Error in filter: " + e.getMessage());
//            e.printStackTrace();
//            throw e;
//        }
//    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletResponse response = (HttpServletResponse) res;
        HttpServletRequest request = (HttpServletRequest) req;
        String origin = request.getHeader("Origin");

        // Trust the incoming origin (needed for ngrok/localhost switching)
        if (origin != null && !origin.isEmpty()) {
            response.setHeader("Access-Control-Allow-Origin", origin);
        } else {
            response.setHeader("Access-Control-Allow-Origin", "*");
        }

        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");

        // EXPLICITLY list the headers. Sometimes "*" is ignored in preflight.
        response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning");
        response.setHeader("Access-Control-Max-Age", "3600");

        // Handle Preflight
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            // Important: we must return here so the request doesn't hit
            // Spring Security authentication filters which might reject an OPTIONS request
            return;
        }

        chain.doFilter(req, res);
    }

    @Override
    public void destroy() {
    }
}
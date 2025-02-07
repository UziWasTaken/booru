<?php
require_once "util.php";

function checkAuth() {
    $supabase_url = getenv('NEXT_PUBLIC_SUPABASE_URL');
    $supabase_key = getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    // Get the JWT token from the Authorization header
    $headers = getallheaders();
    $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (empty($auth_header)) {
        header('Location: /login.php');
        exit;
    }

    // Basic token validation
    $token = str_replace('Bearer ', '', $auth_header);
    
    // You would typically validate the JWT token here
    // For now, we'll just check if it exists
    if (empty($token)) {
        header('Location: /login.php');
        exit;
    }

    return true;
} 
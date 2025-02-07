<!DOCTYPE html>
<html>
<head>
    <title>Logout - Shimmie Board</title>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
</head>
<body>
    <script>
        // Clear local storage and redirect to login
        localStorage.removeItem('supabase.auth.token');
        window.location.href = '/login.php';
    </script>
</body>
</html> 
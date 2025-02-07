<?php
require_once "core/util.php";

$supabase_url = getenv('NEXT_PUBLIC_SUPABASE_URL');
$supabase_key = getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
?>

<!DOCTYPE html>
<html>
<head>
    <title>Login - Shimmie Board</title>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <style>
        .login-container {
            max-width: 400px;
            margin: 50px auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        input {
            width: 100%;
            padding: 8px;
            margin-top: 5px;
        }
        button {
            width: 100%;
            padding: 10px;
            background: #0070f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .error {
            color: red;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>Login</h2>
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
        </div>
        <button onclick="handleLogin()">Login</button>
        <p>Don't have an account? <a href="signup.php">Sign up</a></p>
        <div id="error" class="error"></div>
    </div>

    <script>
        const supabase = supabase.createClient(
            '<?php echo $supabase_url; ?>',
            '<?php echo $supabase_key; ?>'
        );

        async function handleLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Store the session
                localStorage.setItem('supabase.auth.token', data.session.access_token);
                
                // Redirect to dashboard
                window.location.href = '/index.php';
            } catch (error) {
                errorDiv.textContent = error.message;
            }
        }
    </script>
</body>
</html> 
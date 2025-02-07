<?php
require_once "core/util.php";

$supabase_url = getenv('NEXT_PUBLIC_SUPABASE_URL');
$supabase_key = getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
?>

<!DOCTYPE html>
<html>
<head>
    <title>Sign Up - Shimmie Board</title>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <style>
        .signup-container {
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
    <div class="signup-container">
        <h2>Sign Up</h2>
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
        </div>
        <button onclick="handleSignup()">Sign Up</button>
        <p>Already have an account? <a href="login.php">Login</a></p>
        <div id="error" class="error"></div>
    </div>

    <script>
        const supabase = supabase.createClient(
            '<?php echo $supabase_url; ?>',
            '<?php echo $supabase_key; ?>'
        );

        async function handleSignup() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');

            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Show success message
                errorDiv.style.color = 'green';
                errorDiv.textContent = 'Registration successful! Please check your email to verify your account.';
            } catch (error) {
                errorDiv.textContent = error.message;
            }
        }
    </script>
</body>
</html> 
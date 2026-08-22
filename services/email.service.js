import { BrevoClient } from "@getbrevo/brevo";
import { ENV } from "../config/env.js";

let brevoClient = null;

/* =========================================================
   CREATE / GET BREVO CLIENT
========================================================= */

const getBrevoClient = () => {
  if (brevoClient) {
    return brevoClient;
  }

  if (!ENV.BREVO_API_KEY) {
    throw new Error(
      "Email configuration is missing. Check BREVO_API_KEY."
    );
  }

  brevoClient = new BrevoClient({
    apiKey: ENV.BREVO_API_KEY,
  });

  return brevoClient;
};

/* =========================================================
   VERIFY EMAIL CONNECTION
========================================================= */

/*
  Brevo uses an HTTPS API.
  There is no SMTP transporter.verify() required.

  We only initialize the Brevo client here.
  The actual API key is verified when an email is sent.
*/

export const verifyEmailConnection = async () => {
  try {
    getBrevoClient();

    console.log("✅ Brevo email client initialized");

    return true;
  } catch (error) {
    console.error(
      "⚠️ Brevo email configuration warning:",
      error?.message || error
    );

    return false;
  }
};

/* =========================================================
   SEND EMAIL
========================================================= */

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}) => {
  if (!to) {
    throw new Error(
      "Recipient email address is required."
    );
  }

  if (!subject) {
    throw new Error(
      "Email subject is required."
    );
  }

  const brevo = getBrevoClient();

  try {
    const response =
      await brevo.transactionalEmails.sendTransacEmail({
        sender: {
          name: ENV.EMAIL_FROM_NAME || "SLMS",
          email: ENV.EMAIL_FROM,
        },

        to: [
          {
            email: to,
          },
        ],

        subject,

        htmlContent: html,

        textContent: text,
      });

    console.log(
      `✅ Email sent successfully to ${to}`
    );

    console.log(
      `📨 Message ID: ${response?.messageId || "N/A"}`
    );

    return {
      success: true,
      messageId: response?.messageId || null,
    };
  } catch (error) {
    console.error("❌ Brevo email failed");

    console.error("Recipient:", to);
    console.error("Subject:", subject);

    console.error(
      "Error:",
      error?.message || error
    );

    throw new Error(
      `Email sending failed: ${
        error?.message || "Unknown Brevo error"
      }`
    );
  }
};

/* =========================================================
   LOGIN VERIFICATION OTP
========================================================= */

export const sendLoginOtpEmail = async ({
  to,
  name,
  otp,
}) => {
  if (!otp) {
    throw new Error("OTP is required.");
  }

  const subject =
    "SLMS - Login Verification Code";

  const text = `
Hello ${name || "User"},

Your SLMS login verification code is:

${otp}

This code expires in 5 minutes.

Do not share this code with anyone.

Regards,
SLMS Security Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>SLMS Login Verification</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background-color: #f5f7fb;
    font-family: Arial, sans-serif;
  "
>
  <div
    style="
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 30px;
    "
  >
    <h2 style="color: #4f46e5; margin-bottom: 8px;">
      School Learning Management System
    </h2>

    <h3>Login Verification Code</h3>

    <p>
      Hello <strong>${name || "User"}</strong>,
    </p>

    <p>
      Your SLMS login verification code is:
    </p>

    <div
      style="
        background: #f3f4f6;
        padding: 18px;
        text-align: center;
        border-radius: 8px;
        margin: 24px 0;
      "
    >
      <span
        style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #111827;
        "
      >
        ${otp}
      </span>
    </div>

    <p>
      This code expires in <strong>5 minutes</strong>.
    </p>

    <p
      style="
        color: #6b7280;
        font-size: 13px;
      "
    >
      If you did not attempt to log in,
      please contact your administrator immediately.
    </p>

    <hr
      style="
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 25px 0;
      "
    />

    <p
      style="
        color: #9ca3af;
        font-size: 12px;
      "
    >
      Regards,<br />
      SLMS Security Team
    </p>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

/* =========================================================
   TEACHER FIRST-TIME VERIFICATION OTP
========================================================= */

export const sendTeacherVerificationOtpEmail = async ({
  to,
  name,
  otp,
}) => {
  if (!otp) {
    throw new Error("OTP is required.");
  }

  const subject =
    "SLMS - First-Time Teacher Verification Code";

  const text = `
Hello ${name},

Your SLMS email verification code is:

${otp}

This code expires in 5 minutes.

Do not share this code with anyone.

Regards,
SLMS Administration
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>SLMS Verification Code</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background-color: #f5f7fb;
    font-family: Arial, Helvetica, sans-serif;
  "
>
  <div
    style="
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 30px;
    "
  >
    <h2 style="color: #4f46e5;">
      School Learning Management System
    </h2>

    <h3>First-Time Teacher Verification</h3>

    <p>
      Hello <strong>${name}</strong>,
    </p>

    <p>
      Your SLMS email verification code is:
    </p>

    <div
      style="
        background: #f3f4f6;
        padding: 18px;
        text-align: center;
        border-radius: 8px;
        margin: 24px 0;
      "
    >
      <span
        style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #111827;
        "
      >
        ${otp}
      </span>
    </div>

    <p>
      This verification code expires in
      <strong>5 minutes</strong>.
    </p>

    <p
      style="
        color: #6b7280;
        font-size: 13px;
      "
    >
      If you did not request this verification,
      please contact your school administrator.
    </p>

    <hr
      style="
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 25px 0;
      "
    />

    <p
      style="
        color: #9ca3af;
        font-size: 12px;
      "
    >
      Regards,<br />
      SLMS Administration
    </p>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

/* =========================================================
   FORGOT PASSWORD OTP
========================================================= */

export const sendForgotPasswordOtpEmail = async ({
  to,
  name,
  otp,
}) => {
  if (!otp) {
    throw new Error("OTP is required.");
  }

  const subject =
    "SLMS - Password Reset Verification Code";

  const text = `
Hello ${name},

Your SLMS password reset verification code is:

${otp}

This code expires in 5 minutes.

Do not share this code with anyone.

Regards,
SLMS Administration
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>SLMS Password Reset</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background: #f5f7fb;
    font-family: Arial, Helvetica, sans-serif;
  "
>
  <div
    style="
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 30px;
    "
  >
    <h2 style="color: #dc2626;">
      SLMS Security
    </h2>

    <h3>Password Reset Verification</h3>

    <p>
      Hello <strong>${name}</strong>,
    </p>

    <p>
      Your password reset verification code is:
    </p>

    <div
      style="
        background: #fee2e2;
        padding: 18px;
        text-align: center;
        border-radius: 8px;
        margin: 24px 0;
      "
    >
      <span
        style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #991b1b;
        "
      >
        ${otp}
      </span>
    </div>

    <p>
      This code expires in
      <strong>5 minutes</strong>.
    </p>

    <p
      style="
        color: #6b7280;
        font-size: 13px;
      "
    >
      If you did not request a password reset,
      contact your school administrator immediately.
    </p>

    <hr
      style="
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 25px 0;
      "
    />

    <p
      style="
        color: #9ca3af;
        font-size: 12px;
      "
    >
      Regards,<br />
      SLMS Security Team
    </p>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

/* =========================================================
   PASSWORD CHANGED NOTIFICATION
========================================================= */

export const sendPasswordChangedNotificationEmail = async ({
  to,
  name,
}) => {
  const subject =
    "SLMS Security Alert - Password Changed";

  const text = `
Hello ${name},

Your SLMS account password was changed successfully.

If you did not make this change,
please contact your school administrator immediately.

Regards,
SLMS Security
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Password Changed</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background: #f5f7fb;
    font-family: Arial, Helvetica, sans-serif;
  "
>
  <div
    style="
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    "
  >
    <h2 style="color: #059669;">
      SLMS Security Notification
    </h2>

    <p>
      Hello <strong>${name}</strong>,
    </p>

    <p>
      Your SLMS account password was updated successfully.
    </p>

    <div
      style="
        background: #ecfdf5;
        border-left: 4px solid #10b981;
        padding: 12px;
        margin: 20px 0;
      "
    >
      <p
        style="
          margin: 0;
          color: #065f46;
        "
      >
        If you performed this action,
        no further action is required.
      </p>
    </div>

    <p
      style="
        color: #dc2626;
        font-size: 13px;
      "
    >
      If you did not authorize this change,
      contact your administrator immediately.
    </p>

    <hr
      style="
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 25px 0;
      "
    />

    <p
      style="
        color: #9ca3af;
        font-size: 12px;
      "
    >
      Regards,<br />
      SLMS Security Team
    </p>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

/* =========================================================
   TEACHER ACCOUNT CREATED EMAIL
========================================================= */

export const sendTeacherAccountCreatedEmail = async ({
  to,
  name,
}) => {
  const subject =
    "Welcome to SLMS - Teacher Account Created";

  const text = `
Hello ${name},

Your teacher account has been created by your
school administrator.

Please log in using the initial credentials provided
by your administrator.

During your first login, you will complete email
verification and account setup.

Regards,
SLMS Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>SLMS Teacher Account</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background: #f5f7fb;
    font-family: Arial, Helvetica, sans-serif;
  "
>
  <div
    style="
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    "
  >
    <h2 style="color: #4f46e5;">
      Welcome to SLMS
    </h2>

    <p>
      Hello <strong>${name}</strong>,
    </p>

    <p>
      Your teacher account has been created by your
      principal/administrator.
    </p>

    <p>
      Please log in using the initial credentials
      provided by your administrator.
    </p>

    <p>
      During your first login, you will complete
      email OTP verification and account setup.
    </p>

    <hr
      style="
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 25px 0;
      "
    />

    <p
      style="
        color: #9ca3af;
        font-size: 12px;
      "
    >
      Regards,<br />
      SLMS Team
    </p>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};
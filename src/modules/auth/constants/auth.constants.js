export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED_ROLE: 'You are not authorized to access this panel',
  INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
  LOGOUT_SUCCESS: 'Logged out successfully',
  OTP_SENT: 'OTP sent to your email',
  OTP_INVALID: 'Invalid or expired OTP',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully',
};

export const AUTH_ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE', 'MARKETING', 'DIVISION_MANAGER'];

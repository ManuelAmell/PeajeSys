using System;
using System.Collections.Generic;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Core.Security;

public class PasswordHasher : IPasswordHasher
{
    private readonly int _costFactor;
    private readonly string _defaultDevPassword;
    private readonly HashSet<string> _seedUsers;

    public PasswordHasher(int costFactor = 12, string defaultDevPassword = "Turno123*")
    {
        _costFactor = costFactor;
        _defaultDevPassword = defaultDevPassword;
        _seedUsers = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-005",
            "EMP-006", "EMP-007", "EMP-008", "EMP-009", "EMP-010",
            "ADM-001"
        };
    }

    public string HashPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
            throw new ArgumentException("La contrasena no puede estar vacia.", nameof(password));

        return BCryptImplementation.HashPassword(password, _costFactor);
    }

    public bool VerifyPassword(string password, string hash)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hash))
            return false;

        return BCryptImplementation.Verify(password, hash);
    }

    public bool VerifySeedUser(string codigoEmpleado, string password)
    {
        if (string.IsNullOrWhiteSpace(codigoEmpleado) || string.IsNullOrEmpty(password))
            return false;

        string normalizedCode = codigoEmpleado.Trim().ToUpperInvariant();
        if (_seedUsers.Contains(normalizedCode))
        {
            return password == _defaultDevPassword;
        }

        return false;
    }
}

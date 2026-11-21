using System;
using PeajeSys.Core.Interfaces;

namespace PeajeSys.Core.Security;

public class PasswordHasher : IPasswordHasher
{
    private readonly int _costFactor;

    public PasswordHasher(int costFactor)
    {
        _costFactor = costFactor;
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
}

using System;
using System.Security.Cryptography;
using System.Text;

namespace PeajeSys.Core.Security;

/// <summary>
/// Implementacion completa, autonoma y estandar de BCrypt (OpenBSD Blowfish)
/// conforme a la especificacion con factor de costo configurable (defecto 12).
/// </summary>
public static class BCryptImplementation
{
    private const int BCRYPT_SALT_LEN = 16;
    private const int BLOWFISH_NUM_ROUNDS = 16;

    private static readonly uint[] P_ORIG = new uint[]
    {
        0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344,
        0xa4093822, 0x299f31d0, 0x082efa98, 0xec4e6c89,
        0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c,
        0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5, 0xb5470917,
        0x9216d5d9, 0x8979fb1b
    };

    private static readonly uint[] S_ORIG = new uint[]
    {
        0xd1310ba6, 0x98dfb5ac, 0x2ffd72db, 0xd01adfb7,
        0xb8e1afed, 0x6a267e96, 0xba7c9045, 0xf12c7f99,
        0x24a19947, 0xb3916cf7, 0x0801f2e2, 0x858efc16,
        0x636920d8, 0x71574e69, 0xa458fea3, 0xf4933d7e,
        0x0d95748f, 0x728eb658, 0x718bcd58, 0x82154aee,
        0x7b54a41d, 0xc25a59b5, 0x9c30d539, 0x2af26013,
        0xc5d1b023, 0x286085f0, 0xca417918, 0xb8db38ef,
        0x8e79dcb0, 0x603a180e, 0x6c9e0e8b, 0xb01e8a3e,
        0xd71577c1, 0xbd314b27, 0x78af2fda, 0x55605c60,
        0xe65525f3, 0xaa55ab94, 0x57489862, 0x63e81440,
        0x55ca396a, 0x2aab10b6, 0xb4cc5c34, 0x1141e8ce,
        0xa15486af, 0x7c72e993, 0xb3ee1411, 0x636fbc2a,
        0x2ba9c55d, 0x741831f6, 0xce5c3e16, 0x9b87931e,
        0xafd6ba33, 0x6c24cf5c, 0x7a325381, 0x28958677,
        0x3b8f4898, 0x6b4bb9af, 0xc4bfe81b, 0x66282193,
        0x61d809cc, 0xfb21a991, 0x487cac60, 0x5dec8032,
        0xef845d5d, 0x6a14711f, 0xa4c60a07, 0x7e0a68d2,
        0xceb69ceb, 0x61b9704e, 0x5064f894, 0x95635a2b,
        0xb454283b, 0xdf39744f, 0x96ac4f07, 0x772c7454,
        0x0773e0e9, 0x70c0fe71, 0x62f211f7, 0x4919d90c,
        0x0845f143, 0x7902d186, 0x5c829a4b, 0x89a47840,
        0xbb980824, 0xeb70a0e0, 0xb025d324, 0x64425301,
        0xf04e29e0, 0xad0f6075, 0x1fedaa9e, 0x6ec51a0e,
        0x0d3c0a75, 0x0c30f0c5, 0x4705dcf5, 0x3764024e,
        0x8f934d28, 0xfb0521f5, 0x46142e0d, 0xd302a0fb,
        0xf391fe43, 0x614f6415, 0xfc390340, 0x4d9360f4,
        0x3da76334, 0x7dcd43c4, 0x23c49cab, 0x429f5eee,
        0x05c42c35, 0x931a4435, 0x64f143fb, 0xbba64746,
        0x12a64cd2, 0xf312ab66, 0xd0a1122b, 0x1502b247,
        0xf088d810, 0xd0f51948, 0x6f4e89ee, 0xb80c6845,
        0xa48a209c, 0x04401560, 0x59baf620, 0x53f84e80,
        0xa0fe4a9f, 0x0430e555, 0x543e1a98, 0x56a429b5,
        0x83321d10, 0x0f544ae4, 0xa75c4e87, 0xb71726e8,
        0x02c2f8b5, 0x997560d2, 0xdc7e7e4a, 0x6112404a,
        0xa010d83c, 0x11e0577e, 0x6271a044, 0x52774865,
        0x43b4f050, 0x591d12d8, 0x93983334, 0xb1d91b7e,
        0xe3839352, 0x4a457361, 0x8a500f3d, 0x6602d4e7,
        0x9ddb29aa, 0x4a04f5cf, 0x723c6ab8, 0x8019ee81,
        0x8acfe856, 0x801834b7, 0xb8838ec9, 0x59a30d5e,
        0x20354275, 0xb6e8116c, 0x98e09cde, 0x85662729,
        0x6f04d885, 0x614970ce, 0x83fe0f86, 0x0cb1dc3d,
        0xa462eb82, 0xb64e4637, 0x728da456, 0x613845e1,
        0x8be0e3da, 0xe91c14b6, 0x463dd1f0, 0x82894486,
        0xdf722c2b, 0x8942782f, 0x528b3087, 0x600f1c65,
        0xbcbf5002, 0x64f614f9, 0xec72e97a, 0x021a3722,
        0x0bf8a976, 0x6357610a, 0xa436b1d4, 0x9ff3761e,
        0x65f74a94, 0x083e9360, 0x2806615f, 0xce997c74,
        0xbf599d7f, 0xea9f5358, 0x709e33bd, 0xc22886ac,
        0xd19570f7, 0xa4466a37, 0x5e47a408, 0x41e65a75,
        0x32c5f136, 0x6ec0c504, 0x4449b540, 0x3fb1996e,
        0xdc262302, 0xeb651b88, 0x23893e81, 0xd396acc5,
        0x0f6d6ff3, 0x83f44239, 0x2e0b4482, 0xa4842004,
        0x69c8f04a, 0x9e1f9b5e, 0x21c66842, 0xf6e96c9a,
        0x670c9c61, 0xabd388f0, 0x6a51a0d2, 0xd8542f68,
        0x960fa728, 0xab5133a3, 0x6eef0b6c, 0x137a3be4,
        0xba3bf050, 0x7efb2bbe, 0x8b147da9, 0x5fc523a4,
        0x6d7d6160, 0x86cfbc25, 0x7748492b, 0x6e0b14f2,
        0xded40100, 0xaff6a682, 0x5608799e, 0x6411fe33,
        0x4973d096, 0xc3a40e6f, 0xbac90a7d, 0xd10044d2,
        0x61ff165b, 0x865bf5af, 0xa747d2a2, 0x78a373b5,
        0x8090a39a, 0xdb1bfb2f, 0x7ecb82ea, 0xb1b0aeed,
        0xd7235078, 0x9b6ccea7, 0xadc2cc23, 0x9159047e,
        0xecbf0020, 0x567742ad, 0x070ac039, 0x9d27a8e0,
        0x0ca6ff3c, 0x875a14d5, 0x6f9de92e, 0xcd6115ee
    };

    private static readonly uint[] BCRYPT_INIT_STATE = new uint[]
    {
        0x4f727068, 0x65616e42, 0x65686f6c, 0x64657253, 0x63727961, 0x7468
    };

    private static readonly char[] B64_CHARS =
        "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".ToCharArray();

    private static readonly byte[] B64_INDEX = new byte[128];

    static BCryptImplementation()
    {
        for (int i = 0; i < B64_INDEX.Length; i++) B64_INDEX[i] = 255;
        for (byte i = 0; i < B64_CHARS.Length; i++) B64_INDEX[(byte)B64_CHARS[i]] = i;
    }

    public static string HashPassword(string password, int workFactor = 12)
    {
        if (workFactor < 4 || workFactor > 31)
            throw new ArgumentOutOfRangeException(nameof(workFactor), "Factor de costo debe estar entre 4 y 31.");

        byte[] salt = new byte[BCRYPT_SALT_LEN];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(salt);
        }

        return Crypt(password, salt, workFactor);
    }

    public static bool Verify(string password, string hash)
    {
        if (string.IsNullOrEmpty(hash) || hash.Length < 28)
            return false;

        if (!hash.StartsWith("$2a$") && !hash.StartsWith("$2b$") && !hash.StartsWith("$2y$"))
            return false;

        string[] parts = hash.Split('$');
        if (parts.Length != 4) return false;

        if (!int.TryParse(parts[2], out int workFactor)) return false;

        string saltStr = parts[3].Substring(0, 22);
        byte[] salt = DecodeBase64(saltStr, BCRYPT_SALT_LEN);

        string computed = Crypt(password, salt, workFactor, parts[1]);
        return CryptographicEquals(hash, computed);
    }

    private static string Crypt(string password, byte[] salt, int workFactor, string minor = "2a")
    {
        byte[] passBytes = Encoding.UTF8.GetBytes(password + "\0");
        uint[] p = new uint[18];
        uint[] s = new uint[1024];

        InitBlowfish(p, s);
        EksBlowfishKey(p, s, passBytes, salt);

        int rounds = 1 << workFactor;
        for (int i = 0; i < rounds; i++)
        {
            EksBlowfishKey(p, s, passBytes, null);
            EksBlowfishKey(p, s, salt, null);
        }

        uint[] ctext = (uint[])BCRYPT_INIT_STATE.Clone();
        for (int i = 0; i < 64; i++)
        {
            for (int j = 0; j < ctext.Length; j += 2)
            {
                EncryptBlock(p, s, ref ctext[j], ref ctext[j + 1]);
            }
        }

        byte[] ctextBytes = new byte[ctext.Length * 4];
        for (int i = 0; i < ctext.Length; i++)
        {
            ctextBytes[i * 4 + 0] = (byte)((ctext[i] >> 24) & 0xff);
            ctextBytes[i * 4 + 1] = (byte)((ctext[i] >> 16) & 0xff);
            ctextBytes[i * 4 + 2] = (byte)((ctext[i] >> 8) & 0xff);
            ctextBytes[i * 4 + 3] = (byte)(ctext[i] & 0xff);
        }

        StringBuilder sb = new StringBuilder();
        sb.Append("$").Append(minor).Append("$");
        if (workFactor < 10) sb.Append("0");
        sb.Append(workFactor).Append("$");
        sb.Append(EncodeBase64(salt, salt.Length));
        sb.Append(EncodeBase64(ctextBytes, ctextBytes.Length - 1)); // 23 bytes en base64 -> 31 chars

        return sb.ToString();
    }

    private static void InitBlowfish(uint[] p, uint[] s)
    {
        Array.Copy(P_ORIG, p, P_ORIG.Length);
        for (int i = 0; i < 4; i++)
        {
            Array.Copy(S_ORIG, 0, s, i * 256, S_ORIG.Length);
        }
    }

    private static void EksBlowfishKey(uint[] p, uint[] s, byte[] key, byte[]? salt)
    {
        int keyIndex = 0;
        for (int i = 0; i < p.Length; i++)
        {
            uint data = 0;
            for (int k = 0; k < 4; k++)
            {
                data = (data << 8) | key[keyIndex];
                keyIndex = (keyIndex + 1) % key.Length;
            }
            p[i] ^= data;
        }

        uint l = 0, r = 0;
        int saltIndex = 0;
        for (int i = 0; i < p.Length; i += 2)
        {
            if (salt != null && salt.Length > 0)
            {
                uint sdata1 = 0, sdata2 = 0;
                for (int k = 0; k < 4; k++)
                {
                    sdata1 = (sdata1 << 8) | salt[saltIndex];
                    saltIndex = (saltIndex + 1) % salt.Length;
                }
                for (int k = 0; k < 4; k++)
                {
                    sdata2 = (sdata2 << 8) | salt[saltIndex];
                    saltIndex = (saltIndex + 1) % salt.Length;
                }
                l ^= sdata1;
                r ^= sdata2;
            }
            EncryptBlock(p, s, ref l, ref r);
            p[i] = l;
            p[i + 1] = r;
        }

        for (int i = 0; i < 1024; i += 2)
        {
            if (salt != null && salt.Length > 0)
            {
                uint sdata1 = 0, sdata2 = 0;
                for (int k = 0; k < 4; k++)
                {
                    sdata1 = (sdata1 << 8) | salt[saltIndex];
                    saltIndex = (saltIndex + 1) % salt.Length;
                }
                for (int k = 0; k < 4; k++)
                {
                    sdata2 = (sdata2 << 8) | salt[saltIndex];
                    saltIndex = (saltIndex + 1) % salt.Length;
                }
                l ^= sdata1;
                r ^= sdata2;
            }
            EncryptBlock(p, s, ref l, ref r);
            s[i] = l;
            s[i + 1] = r;
        }
    }

    private static void EncryptBlock(uint[] p, uint[] s, ref uint xl, ref uint xr)
    {
        uint l = xl, r = xr;
        for (int i = 0; i < BLOWFISH_NUM_ROUNDS; i++)
        {
            l ^= p[i];
            r ^= F(s, l);
            uint temp = l; l = r; r = temp;
        }
        uint t = l; l = r; r = t;
        r ^= p[BLOWFISH_NUM_ROUNDS];
        l ^= p[BLOWFISH_NUM_ROUNDS + 1];
        xl = l; xr = r;
    }

    private static uint F(uint[] s, uint x)
    {
        uint a = (x >> 24) & 0xff;
        uint b = (x >> 16) & 0xff;
        uint c = (x >> 8) & 0xff;
        uint d = x & 0xff;
        return ((s[a] + s[256 + b]) ^ s[512 + c]) + s[768 + d];
    }

    private static string EncodeBase64(byte[] d, int len)
    {
        StringBuilder rs = new StringBuilder();
        int c1, c2, off = 0;
        while (off < len)
        {
            c1 = d[off++] & 0xff;
            rs.Append(B64_CHARS[(c1 >> 2) & 0x3f]);
            c1 = (c1 & 0x03) << 4;
            if (off >= len)
            {
                rs.Append(B64_CHARS[c1 & 0x3f]);
                break;
            }
            c2 = d[off++] & 0xff;
            c1 |= (c2 >> 4) & 0x0f;
            rs.Append(B64_CHARS[c1 & 0x3f]);
            c1 = (c2 & 0x0f) << 2;
            if (off >= len)
            {
                rs.Append(B64_CHARS[c1 & 0x3f]);
                break;
            }
            c2 = d[off++] & 0xff;
            c1 |= (c2 >> 6) & 0x03;
            rs.Append(B64_CHARS[c1 & 0x3f]);
            rs.Append(B64_CHARS[c2 & 0x3f]);
        }
        return rs.ToString();
    }

    private static byte[] DecodeBase64(string s, int maxLen)
    {
        byte[] rs = new byte[maxLen];
        int off = 0, slen = s.Length, olen = 0;
        while (off < slen - 1 && olen < maxLen)
        {
            byte c1 = B64_INDEX[(byte)s[off++]];
            byte c2 = B64_INDEX[(byte)s[off++]];
            if (c1 == 255 || c2 == 255) break;
            rs[olen++] = (byte)((c1 << 2) | ((c2 & 0x30) >> 4));
            if (olen >= maxLen || off >= slen) break;
            byte c3 = B64_INDEX[(byte)s[off++]];
            if (c3 == 255) break;
            rs[olen++] = (byte)(((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2));
            if (olen >= maxLen || off >= slen) break;
            byte c4 = B64_INDEX[(byte)s[off++]];
            if (c4 == 255) break;
            rs[olen++] = (byte)(((c3 & 0x03) << 6) | c4);
        }
        return rs;
    }

    private static bool CryptographicEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        int result = 0;
        for (int i = 0; i < a.Length; i++)
        {
            result |= a[i] ^ b[i];
        }
        return result == 0;
    }
}

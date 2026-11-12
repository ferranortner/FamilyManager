namespace FinanceApp.API.Data
{
    /// <summary>
    /// Escriptura segura de fitxers JSON: escriu a un .tmp, fa una còpia .bak
    /// de la versió anterior i després substitueix el fitxer. Si el procés es
    /// talla a mig, el fitxer original (o el .bak) continua intacte.
    /// </summary>
    public static class SafeJsonFile
    {
        public static void WriteAtomic(string path, string json)
        {
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir))
                Directory.CreateDirectory(dir);

            var tmp = path + ".tmp";
            var bak = path + ".bak";

            File.WriteAllText(tmp, json);

            if (File.Exists(path))
                File.Copy(path, bak, overwrite: true);

            File.Move(tmp, path, overwrite: true);
        }

        public static async Task WriteAtomicAsync(string path, string json)
        {
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir))
                Directory.CreateDirectory(dir);

            var tmp = path + ".tmp";
            var bak = path + ".bak";

            await File.WriteAllTextAsync(tmp, json);

            if (File.Exists(path))
                File.Copy(path, bak, overwrite: true);

            File.Move(tmp, path, overwrite: true);
        }
    }
}

# 🚀 Guide de Déploiement - Cinnad'moun

## 🎯 Checklist après chaque modification

### ✅ Avant de déployer :

1. **Tester en local** - Vérifier que tout fonctionne
2. **Incrémenter la version** :
   ```bash
   ./bump-version.sh
   ```
   OU manuellement dans `index.html` :
   - Changer `script.js?v=3.0` → `script.js?v=3.1`
   - Changer `styles.css?v=3.0` → `styles.css?v=3.1`

3. **Git commit & push** :
   ```bash
   git add .
   git commit -m "Description des changements"
   git push
   ```

### 📤 Déploiement FTP :

4. **Uploader les fichiers modifiés** via File Manager Hostinger :
   - `index.html` (TOUJOURS si version changée)
   - `script.js` (si modifié)
   - `styles.css` (si modifié)
   - `config.js` (si modifié)
   - `.htaccess` (la première fois seulement)

### 🧹 IMPORTANT - Vider le cache Hostinger :

5. **Dans hPanel Hostinger** :
   - Aller dans **Speed → Cache Manager**
   - Cliquer sur **"Purge All Cache"** / **"Vider le cache"**
   
6. **Si Cloudflare est activé** :
   - Aller dans **Cloudflare → Caching**
   - Cliquer sur **"Purge Everything"**

### ✅ Vérification :

7. **Tester le site** :
   - Ouvrir https://cinnadmoun.re en navigation privée
   - Vérifier la console (F12) pour les erreurs
   - Tester une commande complète

---

## 🔧 Fichiers créés pour éviter les problèmes de cache :

### `.htaccess`
- Cache court pour JS/CSS (1 heure au lieu de plusieurs jours)
- Pas de cache pour HTML
- Compression GZIP activée
- **⚠️ À uploader sur Hostinger une seule fois**

### `bump-version.sh`
- Script qui incrémente automatiquement les numéros de version
- Usage : `./bump-version.sh` dans le terminal
- Évite d'oublier de changer les versions manuellement

---

## 🐛 En cas de problème "l'ancien fichier est encore visible" :

1. Vérifier que le fichier est bien uploadé (date récente dans File Manager)
2. **Vider le cache Hostinger** (Speed → Cache Manager → Purge All)
3. Vider le cache du navigateur (Ctrl+Shift+Delete)
4. Tester en navigation privée
5. Si ça persiste : incrémenter la version dans index.html et ré-uploader

---

## 📞 Contact Support Hostinger :

Si le cache continue de poser problème :
- Chat en direct dans hPanel
- Demander à désactiver le cache agressif pour cinnadmoun.re
- Ou ajuster les règles de cache dans hPanel → Speed

---

## 🎯 Workflow idéal :

```bash
# 1. Faire vos modifications
# 2. Tester localement
# 3. Incrémenter la version
./bump-version.sh

# 4. Commit & push
git add .
git commit -m "Fix: Description du changement"
git push

# 5. Upload FTP manuel (tant que le workflow GitHub Actions ne fonctionne pas)
# 6. Vider le cache Hostinger
# 7. Tester en production
```

---

## ⚡ Astuce Pro :

Pour forcer immédiatement le rechargement sans vider le cache :
- Ajouter un timestamp à l'URL : `script.js?v=3.0&t=1234567890`
- Le script `bump-version.sh` le fait automatiquement !

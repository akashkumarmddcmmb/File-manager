package com.google.android.apps.nbu.files.clone;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.media.MediaScannerConnection;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.os.storage.StorageManager;
import android.os.storage.StorageVolume;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.MimeTypeMap;

import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "RealDeviceStorage")
public class RealDeviceStoragePlugin extends Plugin {

    private boolean hasFullStorageAccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return Environment.isExternalStorageManager();
        } else {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted = hasFullStorageAccess();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("sdkInt", Build.VERSION.SDK_INT);
        ret.put("needsManageSettings", Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAllFilesPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.setData(Uri.parse("package:" + getActivity().getPackageName()));
                    getActivity().startActivity(intent);
                } catch (Exception e) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    getActivity().startActivity(intent);
                }
                JSObject ret = new JSObject();
                ret.put("openedSettings", true);
                ret.put("granted", false);
                call.resolve(ret);
                return;
            }
        } else {
            // Android 10 and below: request legacy permissions
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                getActivity().requestPermissions(new String[]{
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE
                }, 101);
            }
        }

        JSObject ret = new JSObject();
        ret.put("openedSettings", false);
        ret.put("granted", hasFullStorageAccess());
        call.resolve(ret);
    }

    @PluginMethod
    public void getStorageVolumes(PluginCall call) {
        JSObject result = new JSObject();

        // 1. Internal Storage
        File internalDir = Environment.getExternalStorageDirectory();
        String internalPath = internalDir.getAbsolutePath();
        long intTotal = 0;
        long intFree = 0;
        try {
            StatFs stat = new StatFs(internalPath);
            intTotal = stat.getTotalBytes();
            intFree = stat.getAvailableBytes();
        } catch (Exception ignored) {
            intTotal = internalDir.getTotalSpace();
            intFree = internalDir.getFreeSpace();
        }

        JSObject internalObj = new JSObject();
        internalObj.put("name", "Internal Storage");
        internalObj.put("path", internalPath);
        internalObj.put("totalBytes", intTotal);
        internalObj.put("freeBytes", intFree);
        internalObj.put("usedBytes", Math.max(0, intTotal - intFree));
        result.put("internal", internalObj);

        // 2. SD Card / Removable Media Detection
        JSObject sdObj = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            StorageManager sm = (StorageManager) getContext().getSystemService(Context.STORAGE_SERVICE);
            if (sm != null) {
                List<StorageVolume> volumes = sm.getStorageVolumes();
                for (StorageVolume vol : volumes) {
                    if (vol.isRemovable()) {
                        String volPath = null;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            File f = vol.getDirectory();
                            if (f != null) volPath = f.getAbsolutePath();
                        }
                        if (volPath == null) {
                            String desc = vol.getDescription(getContext());
                            volPath = "/storage/" + (desc != null ? desc : "sdcard");
                        }

                        File sdDir = new File(volPath);
                        long sdTotal = sdDir.getTotalSpace();
                        long sdFree = sdDir.getFreeSpace();

                        sdObj = new JSObject();
                        sdObj.put("name", vol.getDescription(getContext()) != null ? vol.getDescription(getContext()) : "SD Card");
                        sdObj.put("path", volPath);
                        sdObj.put("totalBytes", sdTotal);
                        sdObj.put("freeBytes", sdFree);
                        sdObj.put("usedBytes", Math.max(0, sdTotal - sdFree));
                        break;
                    }
                }
            }
        }

        // Fallback: Check /storage directly for mounted removable media
        if (sdObj == null) {
            File storageDir = new File("/storage");
            if (storageDir.exists() && storageDir.isDirectory()) {
                File[] list = storageDir.listFiles();
                if (list != null) {
                    for (File f : list) {
                        String name = f.getName();
                        if (!name.equalsIgnoreCase("emulated") && !name.equalsIgnoreCase("self") && !name.equalsIgnoreCase("knox-emulated")) {
                            long sdTotal = f.getTotalSpace();
                            long sdFree = f.getFreeSpace();
                            if (sdTotal > 0) {
                                sdObj = new JSObject();
                                sdObj.put("name", "SD Card (" + name + ")");
                                sdObj.put("path", f.getAbsolutePath());
                                sdObj.put("totalBytes", sdTotal);
                                sdObj.put("freeBytes", sdFree);
                                sdObj.put("usedBytes", Math.max(0, sdTotal - sdFree));
                                break;
                            }
                        }
                    }
                }
            }
        }

        result.put("sdcard", sdObj);
        call.resolve(result);
    }

    @PluginMethod
    public void listDirectory(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            path = Environment.getExternalStorageDirectory().getAbsolutePath();
        }

        // Sanitize path against directory traversal
        path = sanitizePath(path);

        File dir = new File(path);
        JSObject result = new JSObject();
        result.put("currentPath", path);
        result.put("exists", dir.exists());
        result.put("canRead", dir.canRead());

        JSArray filesArray = new JSArray();
        JSArray foldersArray = new JSArray();

        if (dir.exists() && dir.isDirectory()) {
            File[] items = dir.listFiles();
            if (items != null) {
                for (File item : items) {
                    if (item.getName().startsWith(".")) continue; // skip hidden files

                    boolean isInternal = path.contains("emulated") || !path.startsWith("/storage/");
                    String device = isInternal ? "internal" : "sdcard";

                    if (item.isDirectory()) {
                        JSObject folderObj = new JSObject();
                        folderObj.put("id", "folder-" + item.getAbsolutePath().hashCode());
                        folderObj.put("name", item.getName());
                        folderObj.put("path", item.getAbsolutePath());
                        folderObj.put("parentPath", path);
                        folderObj.put("lastModified", item.lastModified());
                        folderObj.put("storageDevice", device);
                        foldersArray.put(folderObj);
                    } else {
                        JSObject fileObj = new JSObject();
                        fileObj.put("id", "file-" + item.getAbsolutePath().hashCode());
                        fileObj.put("name", item.getName());
                        fileObj.put("path", item.getAbsolutePath());
                        fileObj.put("folder", path);
                        fileObj.put("size", item.length());
                        fileObj.put("lastModified", item.lastModified());
                        fileObj.put("storageDevice", device);
                        String ext = getFileExtension(item.getName());
                        fileObj.put("extension", ext);
                        fileObj.put("mimeType", getMimeType(item.getName()));
                        fileObj.put("type", getCategoryType(ext));
                        filesArray.put(fileObj);
                    }
                }
            }
        }

        result.put("files", filesArray);
        result.put("folders", foldersArray);
        call.resolve(result);
    }

    @PluginMethod
    public void scanMediaCategory(PluginCall call) {
        String category = call.getString("category", "all");
        JSArray filesArray = new JSArray();
        Set<String> visitedPaths = new HashSet<>();

        ContentResolver resolver = getContext().getContentResolver();
        File extDir = Environment.getExternalStorageDirectory();

        if (category.equals("audio") || category.equals("all")) {
            queryMediaStoreRobust(resolver, MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, filesArray, "audio", visitedPaths);
            scanPhysicalFolder(new File(extDir, "Music"), filesArray, "audio", 4, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Download"), filesArray, "audio", 3, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Ringtones"), filesArray, "audio", 2, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Podcasts"), filesArray, "audio", 2, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Recordings"), filesArray, "audio", 3, visitedPaths);
            scanSdCardFolders(filesArray, "audio", visitedPaths);
        }

        if (category.equals("images") || category.equals("all")) {
            queryMediaStoreRobust(resolver, MediaStore.Images.Media.EXTERNAL_CONTENT_URI, filesArray, "image", visitedPaths);
            scanPhysicalFolder(new File(extDir, "DCIM"), filesArray, "images", 4, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Pictures"), filesArray, "images", 4, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Download"), filesArray, "images", 3, visitedPaths);
            scanSdCardFolders(filesArray, "images", visitedPaths);
        }

        if (category.equals("videos") || category.equals("all")) {
            queryMediaStoreRobust(resolver, MediaStore.Video.Media.EXTERNAL_CONTENT_URI, filesArray, "video", visitedPaths);
            scanPhysicalFolder(new File(extDir, "Movies"), filesArray, "videos", 4, visitedPaths);
            scanPhysicalFolder(new File(new File(extDir, "DCIM"), "Camera"), filesArray, "videos", 3, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Download"), filesArray, "videos", 3, visitedPaths);
            scanSdCardFolders(filesArray, "videos", visitedPaths);
        }

        if (category.equals("documents") || category.equals("apps") || category.equals("downloads") || category.equals("all")) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                queryMediaStoreRobust(resolver, MediaStore.Downloads.EXTERNAL_CONTENT_URI, filesArray, "download", visitedPaths);
            }
            scanPhysicalFolder(new File(extDir, "Download"), filesArray, category, 3, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Documents"), filesArray, category, 4, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Documents"), filesArray, "apps", 4, visitedPaths);
            scanPhysicalFolder(new File(extDir, "Download"), filesArray, "apps", 3, visitedPaths);
            scanSdCardFolders(filesArray, category, visitedPaths);
        }

        JSObject res = new JSObject();
        res.put("files", filesArray);
        call.resolve(res);
    }

    private void scanSdCardFolders(JSArray output, String category, Set<String> visited) {
        File storageDir = new File("/storage");
        if (storageDir.exists() && storageDir.isDirectory()) {
            File[] roots = storageDir.listFiles();
            if (roots != null) {
                for (File root : roots) {
                    if (!root.getName().equalsIgnoreCase("emulated") && !root.getName().equalsIgnoreCase("self")) {
                        scanPhysicalFolder(root, output, category, 3, visited);
                    }
                }
            }
        }
    }

    /**
     * Queries MediaStore with modern Android 10+ (Scoped Storage / Relative Path) fallback
     * without relying exclusively on deprecated MediaStore.DATA column.
     */
    private void queryMediaStoreRobust(ContentResolver resolver, Uri uri, JSArray output, String defaultType, Set<String> visited) {
        try {
            List<String> projectionList = new ArrayList<>();
            projectionList.add(MediaStore.MediaColumns._ID);
            projectionList.add(MediaStore.MediaColumns.DISPLAY_NAME);
            projectionList.add(MediaStore.MediaColumns.SIZE);
            projectionList.add(MediaStore.MediaColumns.DATE_MODIFIED);
            projectionList.add(MediaStore.MediaColumns.MIME_TYPE);

            // Add DATA column if available
            projectionList.add(MediaStore.MediaColumns.DATA);

            // Add RELATIVE_PATH on Android 10+ (API 29+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                projectionList.add(MediaStore.MediaColumns.RELATIVE_PATH);
            }

            String[] projection = projectionList.toArray(new String[0]);
            Cursor cursor = resolver.query(uri, projection, null, null, MediaStore.MediaColumns.DATE_MODIFIED + " DESC LIMIT 500");

            if (cursor != null) {
                int idIdx = cursor.getColumnIndex(MediaStore.MediaColumns._ID);
                int nameIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME);
                int sizeIdx = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE);
                int modIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED);
                int mimeIdx = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE);
                int dataIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DATA);
                int relPathIdx = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ? cursor.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH) : -1;

                while (cursor.moveToNext()) {
                    long id = (idIdx != -1) ? cursor.getLong(idIdx) : -1;
                    String name = (nameIdx != -1) ? cursor.getString(nameIdx) : null;
                    String dataPath = (dataIdx != -1) ? cursor.getString(dataIdx) : null;
                    long size = (sizeIdx != -1) ? cursor.getLong(sizeIdx) : 0;
                    long modified = (modIdx != -1) ? cursor.getLong(modIdx) * 1000 : System.currentTimeMillis();
                    String mime = (mimeIdx != -1) ? cursor.getString(mimeIdx) : null;
                    String relPath = (relPathIdx != -1) ? cursor.getString(relPathIdx) : null;

                    // Fallback to construct path if DATA is missing or null (Android 10+)
                    if (dataPath == null || dataPath.isEmpty()) {
                        if (relPath != null && name != null) {
                            dataPath = new File(Environment.getExternalStorageDirectory(), relPath + name).getAbsolutePath();
                        } else if (id != -1) {
                            dataPath = ContentUris.withAppendedId(uri, id).toString();
                        }
                    }

                    if (dataPath == null || visited.contains(dataPath)) continue;
                    visited.add(dataPath);

                    if (name == null && dataPath.contains("/")) {
                        name = dataPath.substring(dataPath.lastIndexOf("/") + 1);
                    }
                    if (name == null || size <= 0) continue;

                    boolean isSd = !dataPath.contains("emulated") && dataPath.startsWith("/storage/");
                    String ext = getFileExtension(name);
                    String categoryType = getCategoryType(ext);

                    JSObject item = new JSObject();
                    item.put("id", "media-" + dataPath.hashCode());
                    item.put("name", name);
                    item.put("path", dataPath);
                    item.put("size", size);
                    item.put("lastModified", modified);
                    item.put("mimeType", mime != null ? mime : getMimeType(name));
                    item.put("extension", ext);
                    item.put("type", categoryType);
                    item.put("storageDevice", isSd ? "sdcard" : "internal");
                    item.put("folder", dataPath.contains("/") ? dataPath.substring(0, dataPath.lastIndexOf("/")) : "");
                    output.put(item);
                }
                cursor.close();
            }
        } catch (Exception e) {
            // Gracefully ignore and rely on physical folder scan
        }
    }

    private void scanPhysicalFolder(File folder, JSArray output, String filterCategory, int depth, Set<String> visited) {
        if (depth < 0 || folder == null || !folder.exists() || !folder.isDirectory()) return;
        File[] files = folder.listFiles();
        if (files == null) return;

        for (File f : files) {
            if (f.getName().startsWith(".")) continue;
            if (f.isDirectory() && depth > 0) {
                scanPhysicalFolder(f, output, filterCategory, depth - 1, visited);
            } else if (f.isFile()) {
                String path = f.getAbsolutePath();
                if (visited.contains(path)) continue;

                String ext = getFileExtension(f.getName());
                String type = getCategoryType(ext);

                boolean include = false;
                if (filterCategory.equals("all")) {
                    include = true;
                } else if (filterCategory.equals("audio") && type.equals("audio")) {
                    include = true;
                } else if (filterCategory.equals("images") && type.equals("image")) {
                    include = true;
                } else if (filterCategory.equals("videos") && type.equals("video")) {
                    include = true;
                } else if (filterCategory.equals("apps") && type.equals("apk")) {
                    include = true;
                } else if (filterCategory.equals("documents") && (type.equals("document") || type.equals("archive"))) {
                    include = true;
                } else if (filterCategory.equals("downloads")) {
                    include = true;
                }

                if (include) {
                    visited.add(path);
                    boolean isSd = !path.contains("emulated") && path.startsWith("/storage/");
                    JSObject item = new JSObject();
                    item.put("id", "file-" + path.hashCode());
                    item.put("name", f.getName());
                    item.put("path", path);
                    item.put("size", f.length());
                    item.put("lastModified", f.lastModified());
                    item.put("mimeType", getMimeType(f.getName()));
                    item.put("extension", ext);
                    item.put("type", type);
                    item.put("storageDevice", isSd ? "sdcard" : "internal");
                    item.put("folder", folder.getAbsolutePath());
                    output.put(item);
                }
            }
        }
    }

    @PluginMethod
    public void createDirectory(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("Path required");
            return;
        }

        path = sanitizePath(path);

        try {
            File dir = new File(path);
            boolean created = dir.exists() || dir.mkdirs();

            if (created) {
                MediaScannerConnection.scanFile(
                        getContext(),
                        new String[]{ dir.getAbsolutePath() },
                        null,
                        null
                );
            }

            JSObject res = new JSObject();
            res.put("success", created);
            res.put("path", dir.getAbsolutePath());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to create directory: " + e.getMessage());
        }
    }

    @PluginMethod
    public void copyFile(PluginCall call) {
        String sourcePath = call.getString("sourcePath");
        String targetFolderPath = call.getString("targetFolderPath");
        if (sourcePath == null || targetFolderPath == null) {
            call.reject("sourcePath and targetFolderPath are required");
            return;
        }

        sourcePath = sanitizePath(sourcePath);
        targetFolderPath = sanitizePath(targetFolderPath);

        try {
            File src = new File(sourcePath);
            if (!src.exists()) {
                call.reject("Source file does not exist: " + sourcePath);
                return;
            }
            File targetDir = new File(targetFolderPath);
            if (!targetDir.exists()) {
                targetDir.mkdirs();
            }

            String name = src.getName();
            File dest = new File(targetDir, name);
            if (dest.exists()) {
                int dot = name.lastIndexOf('.');
                String base = (dot > 0) ? name.substring(0, dot) : name;
                String ext = (dot > 0) ? name.substring(dot) : "";
                int counter = 1;
                while (dest.exists()) {
                    dest = new File(targetDir, base + " (" + counter + ")" + ext);
                    counter++;
                }
            }

            copyFileStream(src, dest);

            // Rescan media store
            MediaScannerConnection.scanFile(
                    getContext(),
                    new String[]{ dest.getAbsolutePath() },
                    null,
                    null
            );

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("newPath", dest.getAbsolutePath());
            res.put("name", dest.getName());
            res.put("size", dest.length());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to copy file: " + e.getMessage());
        }
    }

    @PluginMethod
    public void moveFile(PluginCall call) {
        String sourcePath = call.getString("sourcePath");
        String targetFolderPath = call.getString("targetFolderPath");
        if (sourcePath == null || targetFolderPath == null) {
            call.reject("sourcePath and targetFolderPath are required");
            return;
        }

        sourcePath = sanitizePath(sourcePath);
        targetFolderPath = sanitizePath(targetFolderPath);

        try {
            File src = new File(sourcePath);
            if (!src.exists()) {
                call.reject("Source file does not exist: " + sourcePath);
                return;
            }
            File targetDir = new File(targetFolderPath);
            if (!targetDir.exists()) {
                targetDir.mkdirs();
            }

            String name = src.getName();
            File dest = new File(targetDir, name);
            if (dest.exists()) {
                int dot = name.lastIndexOf('.');
                String base = (dot > 0) ? name.substring(0, dot) : name;
                String ext = (dot > 0) ? name.substring(dot) : "";
                int counter = 1;
                while (dest.exists()) {
                    dest = new File(targetDir, base + " (" + counter + ")" + ext);
                    counter++;
                }
            }

            boolean renamed = src.renameTo(dest);
            if (!renamed) {
                copyFileStream(src, dest);
                src.delete();
            }

            MediaScannerConnection.scanFile(
                    getContext(),
                    new String[]{ sourcePath, dest.getAbsolutePath() },
                    null,
                    null
            );

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("newPath", dest.getAbsolutePath());
            res.put("name", dest.getName());
            res.put("size", dest.length());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to move file: " + e.getMessage());
        }
    }

    private void copyFileStream(File source, File dest) throws Exception {
        try (FileInputStream fis = new FileInputStream(source);
             FileOutputStream fos = new FileOutputStream(dest)) {
            byte[] buffer = new byte[65536];
            int length;
            while ((length = fis.read(buffer)) > 0) {
                fos.write(buffer, 0, length);
            }
            fos.flush();
            fos.getFD().sync();
        }
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Path required");
            return;
        }
        path = sanitizePath(path);
        File f = new File(path);
        if (!f.exists()) {
            call.reject("File does not exist");
            return;
        }
        boolean deleted = f.delete();
        if (deleted) {
            MediaScannerConnection.scanFile(getContext(), new String[]{ path }, null, null);
        }
        JSObject res = new JSObject();
        res.put("success", deleted);
        call.resolve(res);
    }

    @PluginMethod
    public void openFileWithApp(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Path required");
            return;
        }
        path = sanitizePath(path);

        File file = new File(path);
        if (!file.exists()) {
            call.reject("File does not exist: " + path);
            return;
        }

        try {
            Uri contentUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            String mime = getMimeType(file.getName());

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, mime);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(Intent.createChooser(intent, "Open with"));
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Unable to open file: " + e.getMessage());
        }
    }

    @PluginMethod
    public void canWriteSettings(PluginCall call) {
        boolean canWrite = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            canWrite = Settings.System.canWrite(getContext());
        }
        JSObject res = new JSObject();
        res.put("canWrite", canWrite);
        call.resolve(res);
    }

    @PluginMethod
    public void openWriteSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject res = new JSObject();
                res.put("opened", true);
                call.resolve(res);
                return;
            } catch (Exception e) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject res = new JSObject();
                res.put("opened", true);
                call.resolve(res);
                return;
            }
        }
        JSObject res = new JSObject();
        res.put("opened", false);
        call.resolve(res);
    }

    @PluginMethod
    public void setAsRingtone(PluginCall call) {
        String path = call.getString("path");
        String ringtoneType = call.getString("ringtoneType", "ringtone");
        String title = call.getString("title");

        if (path == null) {
            call.reject("Path required");
            return;
        }
        path = sanitizePath(path);
        File srcFile = new File(path);
        if (!srcFile.exists()) {
            call.reject("File does not exist: " + path);
            return;
        }

        // Check if Android requires WRITE_SETTINGS permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.System.canWrite(getContext())) {
                JSObject res = new JSObject();
                res.put("success", false);
                res.put("needsPermission", true);
                res.put("message", "Permission required: Settings.ACTION_MANAGE_WRITE_SETTINGS");
                call.resolve(res);
                return;
            }
        }

        try {
            String targetDirName = Environment.DIRECTORY_RINGTONES;
            int typeFlag = RingtoneManager.TYPE_RINGTONE;
            boolean isRingtone = true;
            boolean isNotification = false;
            boolean isAlarm = false;

            if ("notification".equalsIgnoreCase(ringtoneType)) {
                targetDirName = Environment.DIRECTORY_NOTIFICATIONS;
                typeFlag = RingtoneManager.TYPE_NOTIFICATION;
                isRingtone = false;
                isNotification = true;
                isAlarm = false;
            } else if ("alarm".equalsIgnoreCase(ringtoneType)) {
                targetDirName = Environment.DIRECTORY_ALARMS;
                typeFlag = RingtoneManager.TYPE_ALARM;
                isRingtone = false;
                isNotification = false;
                isAlarm = true;
            } else if ("all".equalsIgnoreCase(ringtoneType)) {
                typeFlag = RingtoneManager.TYPE_RINGTONE | RingtoneManager.TYPE_NOTIFICATION | RingtoneManager.TYPE_ALARM;
                isRingtone = true;
                isNotification = true;
                isAlarm = true;
            }

            File targetDir = Environment.getExternalStoragePublicDirectory(targetDirName);
            if (!targetDir.exists()) {
                targetDir.mkdirs();
            }

            File destFile = new File(targetDir, srcFile.getName());
            if (!destFile.getAbsolutePath().equals(srcFile.getAbsolutePath())) {
                copyFileStream(srcFile, destFile);
            }

            // Trigger media scan
            MediaScannerConnection.scanFile(getContext(), new String[]{ destFile.getAbsolutePath() }, null, null);

            // Register in MediaStore
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DATA, destFile.getAbsolutePath());
            values.put(MediaStore.MediaColumns.TITLE, (title != null && !title.isEmpty()) ? title : destFile.getName());
            values.put(MediaStore.MediaColumns.MIME_TYPE, getMimeType(destFile.getName()));
            values.put(MediaStore.Audio.Media.IS_RINGTONE, isRingtone);
            values.put(MediaStore.Audio.Media.IS_NOTIFICATION, isNotification);
            values.put(MediaStore.Audio.Media.IS_ALARM, isAlarm);
            values.put(MediaStore.Audio.Media.IS_MUSIC, false);

            Uri baseUri = MediaStore.Audio.Media.getContentUriForPath(destFile.getAbsolutePath());
            Uri ringtoneUri = null;

            if (baseUri != null) {
                Cursor cursor = getContext().getContentResolver().query(
                    baseUri,
                    new String[]{ MediaStore.MediaColumns._ID },
                    MediaStore.MediaColumns.DATA + "=?",
                    new String[]{ destFile.getAbsolutePath() },
                    null
                );
                if (cursor != null && cursor.moveToFirst()) {
                    long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
                    ringtoneUri = ContentUris.withAppendedId(baseUri, id);
                    getContext().getContentResolver().update(ringtoneUri, values, null, null);
                    cursor.close();
                } else {
                    if (cursor != null) cursor.close();
                    ringtoneUri = getContext().getContentResolver().insert(baseUri, values);
                }
            }

            if (ringtoneUri == null) {
                ringtoneUri = Uri.fromFile(destFile);
            }

            // Set system actual default ringtone
            if ("notification".equalsIgnoreCase(ringtoneType)) {
                RingtoneManager.setActualDefaultRingtoneUri(getContext(), RingtoneManager.TYPE_NOTIFICATION, ringtoneUri);
            } else if ("alarm".equalsIgnoreCase(ringtoneType)) {
                RingtoneManager.setActualDefaultRingtoneUri(getContext(), RingtoneManager.TYPE_ALARM, ringtoneUri);
            } else if ("all".equalsIgnoreCase(ringtoneType)) {
                RingtoneManager.setActualDefaultRingtoneUri(getContext(), RingtoneManager.TYPE_RINGTONE, ringtoneUri);
                RingtoneManager.setActualDefaultRingtoneUri(getContext(), RingtoneManager.TYPE_NOTIFICATION, ringtoneUri);
                RingtoneManager.setActualDefaultRingtoneUri(getContext(), RingtoneManager.TYPE_ALARM, ringtoneUri);
            } else {
                RingtoneManager.setActualDefaultRingtoneUri(getContext(), RingtoneManager.TYPE_RINGTONE, ringtoneUri);
            }

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("ringtoneType", ringtoneType);
            res.put("targetPath", destFile.getAbsolutePath());
            res.put("uri", ringtoneUri.toString());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to set ringtone: " + e.getMessage());
        }
    }

    private String sanitizePath(String path) {
        if (path == null) return "";
        // If it's a relative path like "/Download", resolve to external storage directory
        if (path.startsWith("/") && !path.startsWith("/storage/") && !path.startsWith("/sdcard") && !path.startsWith("/data/")) {
            File root = Environment.getExternalStorageDirectory();
            path = new File(root, path.substring(1)).getAbsolutePath();
        }
        // Normalize and resolve canonical structure
        try {
            return new File(path).getCanonicalPath();
        } catch (Exception e) {
            return new File(path).getAbsolutePath();
        }
    }

    private String getFileExtension(String name) {
        int idx = name.lastIndexOf('.');
        return (idx > 0 && idx < name.length() - 1) ? name.substring(idx + 1).toLowerCase() : "";
    }

    private String getMimeType(String name) {
        String ext = getFileExtension(name);
        if (ext.equals("apk")) return "application/vnd.android.package-archive";
        if (ext.equals("mp3")) return "audio/mpeg";
        if (ext.equals("wav")) return "audio/wav";
        if (ext.equals("m4a") || ext.equals("aac")) return "audio/mp4";
        if (ext.equals("flac")) return "audio/flac";
        if (ext.equals("ogg") || ext.equals("opus")) return "audio/ogg";
        if (ext.equals("mp4")) return "video/mp4";
        if (ext.equals("mkv")) return "video/x-matroska";
        if (ext.equals("pdf")) return "application/pdf";
        if (ext.equals("zip")) return "application/zip";
        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return mime != null ? mime : "application/octet-stream";
    }

    private String getCategoryType(String ext) {
        if (ext.equals("mp3") || ext.equals("wav") || ext.equals("aac") || ext.equals("flac") || ext.equals("m4a") || ext.equals("ogg") || ext.equals("opus") || ext.equals("wma") || ext.equals("amr")) {
            return "audio";
        }
        if (ext.equals("jpg") || ext.equals("jpeg") || ext.equals("png") || ext.equals("webp") || ext.equals("gif") || ext.equals("heic") || ext.equals("bmp")) {
            return "image";
        }
        if (ext.equals("mp4") || ext.equals("mkv") || ext.equals("webm") || ext.equals("mov") || ext.equals("3gp") || ext.equals("avi") || ext.equals("ts")) {
            return "video";
        }
        if (ext.equals("apk") || ext.equals("xapk")) {
            return "apk";
        }
        if (ext.equals("zip") || ext.equals("rar") || ext.equals("7z") || ext.equals("tar") || ext.equals("gz")) {
            return "archive";
        }
        if (ext.equals("pdf") || ext.equals("doc") || ext.equals("docx") || ext.equals("xls") || ext.equals("xlsx") || ext.equals("ppt") || ext.equals("pptx") || ext.equals("txt")) {
            return "document";
        }
        return "document";
    }
}

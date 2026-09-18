package com.google.android.apps.nbu.files.clone;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

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
            // For Android 10 and below, request normal permissions
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

        // 2. Detect SD Card using StorageManager (Official Android API)
        JSObject sdObj = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                StorageManager sm = (StorageManager) getContext().getSystemService(Context.STORAGE_SERVICE);
                if (sm != null) {
                    List<StorageVolume> volumes = sm.getStorageVolumes();
                    for (StorageVolume vol : volumes) {
                        if (vol.isRemovable()) {
                            File dir = null;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                dir = vol.getDirectory();
                            }
                            if (dir == null) {
                                String uuid = vol.getUuid();
                                if (uuid != null) {
                                    File test = new File("/storage/" + uuid);
                                    if (test.exists()) dir = test;
                                }
                            }
                            if (dir != null && dir.exists()) {
                                long sdTotal = 0;
                                long sdFree = 0;
                                try {
                                    StatFs stat = new StatFs(dir.getAbsolutePath());
                                    sdTotal = stat.getTotalBytes();
                                    sdFree = stat.getAvailableBytes();
                                } catch (Exception e) {
                                    sdTotal = dir.getTotalSpace();
                                    sdFree = dir.getFreeSpace();
                                }
                                String desc = vol.getDescription(getContext());
                                if (desc == null || desc.isEmpty()) {
                                    desc = "SD Card (" + dir.getName() + ")";
                                }
                                sdObj = new JSObject();
                                sdObj.put("name", desc);
                                sdObj.put("path", dir.getAbsolutePath());
                                sdObj.put("totalBytes", sdTotal);
                                sdObj.put("freeBytes", sdFree);
                                sdObj.put("usedBytes", Math.max(0, sdTotal - sdFree));
                                break;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        // Fallback 1: getExternalFilesDirs check
        if (sdObj == null) {
            File[] externalFilesDirs = getContext().getExternalFilesDirs(null);
            if (externalFilesDirs != null) {
                for (File ext : externalFilesDirs) {
                    if (ext != null) {
                        String fullPath = ext.getAbsolutePath();
                        if (!fullPath.startsWith(internalPath)) {
                            int androidIdx = fullPath.indexOf("/Android");
                            String sdRoot = (androidIdx != -1) ? fullPath.substring(0, androidIdx) : fullPath;
                            File sdFile = new File(sdRoot);
                            if (sdFile.exists()) {
                                long sdTotal = 0;
                                long sdFree = 0;
                                try {
                                    StatFs stat = new StatFs(sdRoot);
                                    sdTotal = stat.getTotalBytes();
                                    sdFree = stat.getAvailableBytes();
                                } catch (Exception ignored) {
                                    sdTotal = sdFile.getTotalSpace();
                                    sdFree = sdFile.getFreeSpace();
                                }
                                sdObj = new JSObject();
                                sdObj.put("name", "SD Card (" + sdFile.getName() + ")");
                                sdObj.put("path", sdRoot);
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

        // Fallback 2: Check /storage directly for removable media
        if (sdObj == null) {
            File storageDir = new File("/storage");
            if (storageDir.exists() && storageDir.isDirectory()) {
                File[] list = storageDir.listFiles();
                if (list != null) {
                    for (File f : list) {
                        String name = f.getName();
                        if (!name.equalsIgnoreCase("emulated") && !name.equalsIgnoreCase("self")) {
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

        ContentResolver resolver = getContext().getContentResolver();

        if (category.equals("audio") || category.equals("all")) {
            queryMediaStore(resolver, MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, filesArray, "audio");
            // Physically scan Music & Audio folders across Internal & SD Card
            scanAudioFolders(filesArray);
        }
        if (category.equals("images") || category.equals("all")) {
            queryMediaStore(resolver, MediaStore.Images.Media.EXTERNAL_CONTENT_URI, filesArray, "image");
            scanPhysicalFolder(new File(Environment.getExternalStorageDirectory(), "Pictures"), filesArray, "images", 3);
            scanPhysicalFolder(new File(Environment.getExternalStorageDirectory(), "DCIM"), filesArray, "images", 3);
        }
        if (category.equals("videos") || category.equals("all")) {
            queryMediaStore(resolver, MediaStore.Video.Media.EXTERNAL_CONTENT_URI, filesArray, "video");
            scanPhysicalFolder(new File(Environment.getExternalStorageDirectory(), "Movies"), filesArray, "videos", 3);
            scanPhysicalFolder(new File(new File(Environment.getExternalStorageDirectory(), "DCIM"), "Camera"), filesArray, "videos", 2);
        }
        if (category.equals("downloads") || category.equals("documents") || category.equals("apps") || category.equals("all")) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                queryMediaStore(resolver, MediaStore.Downloads.EXTERNAL_CONTENT_URI, filesArray, "download");
            }
            // Scan real Download and Documents folder directly
            scanPhysicalFolder(new File(Environment.getExternalStorageDirectory(), "Download"), filesArray, category, 2);
            scanPhysicalFolder(new File(Environment.getExternalStorageDirectory(), "Documents"), filesArray, category, 2);
        }

        JSObject res = new JSObject();
        res.put("files", filesArray);
        call.resolve(res);
    }

    private void scanAudioFolders(JSArray output) {
        // 1. Internal Storage Audio & Music Folders
        File extDir = Environment.getExternalStorageDirectory();
        scanPhysicalFolder(new File(extDir, "Music"), output, "audio", 3);
        scanPhysicalFolder(new File(extDir, "Download"), output, "audio", 2);
        scanPhysicalFolder(new File(extDir, "Ringtones"), output, "audio", 2);
        scanPhysicalFolder(new File(extDir, "Podcasts"), output, "audio", 2);
        scanPhysicalFolder(new File(extDir, "Recordings"), output, "audio", 2);

        // 2. SD Card Audio & Music Folders
        File storageDir = new File("/storage");
        if (storageDir.exists() && storageDir.isDirectory()) {
            File[] roots = storageDir.listFiles();
            if (roots != null) {
                for (File root : roots) {
                    if (!root.getName().equalsIgnoreCase("emulated") && !root.getName().equalsIgnoreCase("self")) {
                        scanPhysicalFolder(new File(root, "Music"), output, "audio", 3);
                        scanPhysicalFolder(new File(root, "Download"), output, "audio", 2);
                        scanPhysicalFolder(new File(root, "Songs"), output, "audio", 3);
                        scanPhysicalFolder(root, output, "audio", 1);
                    }
                }
            }
        }
    }

    private void queryMediaStore(ContentResolver resolver, Uri uri, JSArray output, String defaultType) {
        try {
            String[] projection = {
                    MediaStore.MediaColumns._ID,
                    MediaStore.MediaColumns.DISPLAY_NAME,
                    MediaStore.MediaColumns.DATA,
                    MediaStore.MediaColumns.SIZE,
                    MediaStore.MediaColumns.DATE_MODIFIED,
                    MediaStore.MediaColumns.MIME_TYPE
            };

            Cursor cursor = resolver.query(uri, projection, null, null, MediaStore.MediaColumns.DATE_MODIFIED + " DESC LIMIT 300");
            if (cursor != null) {
                int idIdx = cursor.getColumnIndex(MediaStore.MediaColumns._ID);
                int nameIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME);
                int dataIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DATA);
                int sizeIdx = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE);
                int modIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED);
                int mimeIdx = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE);

                while (cursor.moveToNext()) {
                    String name = (nameIdx != -1) ? cursor.getString(nameIdx) : null;
                    String dataPath = (dataIdx != -1) ? cursor.getString(dataIdx) : null;
                    long size = (sizeIdx != -1) ? cursor.getLong(sizeIdx) : 0;
                    long modified = (modIdx != -1) ? cursor.getLong(modIdx) * 1000 : System.currentTimeMillis();
                    String mime = (mimeIdx != -1) ? cursor.getString(mimeIdx) : null;

                    if (name == null && dataPath != null) {
                        name = new File(dataPath).getName();
                    }
                    if (name == null || size <= 0) continue;

                    if (dataPath == null && idIdx != -1) {
                        long id = cursor.getLong(idIdx);
                        dataPath = ContentUris.withAppendedId(uri, id).toString();
                    }
                    if (dataPath == null) continue;

                    boolean isSd = !dataPath.contains("emulated") && dataPath.startsWith("/storage/");

                    JSObject item = new JSObject();
                    item.put("id", "media-" + dataPath.hashCode());
                    item.put("name", name);
                    item.put("path", dataPath);
                    item.put("size", size);
                    item.put("lastModified", modified);
                    item.put("mimeType", mime != null ? mime : getMimeType(name));
                    String ext = getFileExtension(name);
                    item.put("extension", ext);
                    item.put("type", getCategoryType(ext));
                    item.put("storageDevice", isSd ? "sdcard" : "internal");
                    item.put("folder", dataPath.contains("/") ? dataPath.substring(0, dataPath.lastIndexOf("/")) : "");
                    output.put(item);
                }
                cursor.close();
            }
        } catch (Exception e) {
            // Log and continue gracefully
        }
    }

    private void scanPhysicalFolder(File folder, JSArray output, String filterCategory, int depth) {
        if (depth < 0 || folder == null || !folder.exists() || !folder.isDirectory()) return;
        File[] files = folder.listFiles();
        if (files == null) return;

        for (File f : files) {
            if (f.getName().startsWith(".")) continue;
            if (f.isDirectory() && depth > 0) {
                scanPhysicalFolder(f, output, filterCategory, depth - 1);
            } else if (f.isFile()) {
                String ext = getFileExtension(f.getName());
                String type = getCategoryType(ext);

                boolean include = false;
                if (filterCategory.equals("all")) {
                    include = true;
                } else if (filterCategory.equals("audio") && (type.equals("audio") || ext.equals("mp3") || ext.equals("m4a") || ext.equals("aac") || ext.equals("wav") || ext.equals("ogg") || ext.equals("flac") || ext.equals("opus"))) {
                    include = true;
                } else if (filterCategory.equals("images") && type.equals("image")) {
                    include = true;
                } else if (filterCategory.equals("videos") && type.equals("video")) {
                    include = true;
                } else if (filterCategory.equals("apps") && ext.equals("apk")) {
                    include = true;
                } else if (filterCategory.equals("documents") && (type.equals("document") || ext.equals("pdf"))) {
                    include = true;
                } else if (filterCategory.equals("downloads")) {
                    include = true;
                }

                if (include) {
                    boolean isSd = !f.getAbsolutePath().contains("emulated") && f.getAbsolutePath().startsWith("/storage/");
                    JSObject item = new JSObject();
                    item.put("id", "file-" + f.getAbsolutePath().hashCode());
                    item.put("name", f.getName());
                    item.put("path", f.getAbsolutePath());
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
    public void deleteFile(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Path required");
            return;
        }
        File f = new File(path);
        if (!f.exists()) {
            call.reject("File does not exist");
            return;
        }
        boolean deleted = f.delete();
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

            if (file.getName().toLowerCase().endsWith(".apk")) {
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            getContext().startActivity(Intent.createChooser(intent, "Open with"));
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Unable to open file: " + e.getMessage());
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
            return "app";
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

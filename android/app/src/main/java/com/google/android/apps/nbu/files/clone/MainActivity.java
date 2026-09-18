package com.google.android.apps.nbu.files.clone;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RealDeviceStoragePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

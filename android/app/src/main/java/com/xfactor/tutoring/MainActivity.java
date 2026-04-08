package com.xfactor.tutoring;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Keep app content below system status bar for predictable mobile layout.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}

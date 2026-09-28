// lib/screens/maintenance_screen.dart

import 'package:flutter/material.dart';
import '../services/config_service.dart';

class MaintenanceScreen extends StatefulWidget {
  const MaintenanceScreen({super.key});

  @override
  State<MaintenanceScreen> createState() => _MaintenanceScreenState();
}

class _MaintenanceScreenState extends State<MaintenanceScreen> {
  bool _checking = false;

  Future<void> _tryReload() async {
    setState(() => _checking = true);
    final cfg = await ConfigService().fetchConfig(force: true);
    final mode = await ConfigService().getMaintenanceMode();
    setState(() => _checking = false);
    if (!mode) {
      // navigate back to splash so normal flow can continue
      if (mounted) Navigator.pushReplacementNamed(context, '/');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.build, size: 80, color: Colors.orange),
              const SizedBox(height: 16),
              const Text(
                'Ứng dụng đang trong quá trình bảo trì',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Xin vui lòng thử lại sau.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _checking ? null : _tryReload,
                child: _checking
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),),
                      )
                    : const Text('Kiểm tra lại'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

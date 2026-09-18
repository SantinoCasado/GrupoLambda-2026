import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  registrarClienteAnonimo,
  ClienteAnonimoSesion,
} from "../services/clienteAnonimoService";

interface Props {
  onVolver: () => void;
  onRegistroExitoso: (cliente: ClienteAnonimoSesion) => void;
}

export function RegistroAnonimoScreen({ onVolver, onRegistroExitoso }: Props) {
  const [nombre, setNombre] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Tomar selfie con la cámara
  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Se necesita acceso a la cámara para tomar tu foto de ingreso."
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!resultado.canceled && resultado.assets[0]?.uri) {
      setFotoUri(resultado.assets[0].uri);
    }
  };

  const handleIngresar = async () => {
    if (!nombre.trim()) {
      Alert.alert("Atención", "Por favor ingresá tu nombre o apodo.");
      return;
    }

    if (!fotoUri) {
      Alert.alert(
        "Atención",
        "Por favor tomate una foto para que el metre pueda identificarte al llamarte."
      );
      return;
    }

    setCargando(true);
    const res = await registrarClienteAnonimo(nombre, fotoUri);
    setCargando(false);

    if (res.exito && res.cliente) {
      onRegistroExitoso(res.cliente);
    } else {
      Alert.alert(
        "Error",
        res.error || "No se pudo registrar en la lista de espera."
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titulo}>Ingreso como Invitado 🍜</Text>
        <Text style={styles.subtitulo}>
          No requiere contraseña. Solo tu nombre y una foto para asignarte mesa.
        </Text>

        {/* Input de Nombre */}
        <Text style={styles.label}>Tu Nombre / Apodo:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Valen..."
          placeholderTextColor="#888"
          value={nombre}
          onChangeText={setNombre}
        />

        {/* Foto de Perfil */}
        <Text style={styles.label}>Foto de Identificación:</Text>
        <TouchableOpacity
          style={styles.fotoContainer}
          onPress={tomarFoto}
          activeOpacity={0.8}
        >
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.fotoPreview} />
          ) : (
            <View style={styles.placeholderFoto}>
              <Text style={styles.iconoCamara}>📷</Text>
              <Text style={styles.textoCamara}>Tocar para tomar selfie</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Botón Ingresar */}
        <TouchableOpacity
          style={[
            styles.botonIngresar,
            (!nombre || !fotoUri || cargando) && styles.botonDeshabilitado,
          ]}
          onPress={handleIngresar}
          disabled={!nombre || !fotoUri || cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBoton}>Entrar a Lista de Espera</Text>
          )}
        </TouchableOpacity>

        {/* Botón Volver */}
        <TouchableOpacity style={styles.botonVolver} onPress={onVolver}>
          <Text style={styles.textoVolver}>Volver al Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: "#121212", justifyContent: "center", padding: 20,},
  card: {backgroundColor: "#1E1E1E", padding: 24, borderRadius: 16, borderWidth: 1, borderColor: "#333",},
  titulo: {fontSize: 22, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 6,},
  subtitulo: {fontSize: 14, color: "#aaa", textAlign: "center", marginBottom: 20,},
  label: {fontSize: 14, color: "#ddd", marginBottom: 6, marginTop: 10, fontWeight: "600",},
  input: {backgroundColor: "#2A2A2A", color: "#fff", borderRadius: 8, padding: 12, fontSize: 16,
    borderWidth: 1, borderColor: "#444",},
  fotoContainer: {alignItems: "center", justifyContent: "center", marginVertical: 12,},
  placeholderFoto: {width: 130, height: 130, borderRadius: 65, backgroundColor: "#2A2A2A", borderWidth: 2,
    borderColor: "#555", borderStyle: "dashed", alignItems: "center", justifyContent: "center",},
  iconoCamara: {fontSize: 32, marginBottom: 4,},
  textoCamara: {color: "#aaa", fontSize: 12, textAlign: "center", paddingHorizontal: 8,},
  fotoPreview: {width: 130, height: 130, borderRadius: 65, borderWidth: 2, borderColor: "#4CAF50",},
  botonIngresar: {backgroundColor: "#D8572A", paddingVertical: 14, borderRadius: 8, alignItems: "center",
    marginTop: 20,},
  botonDeshabilitado: {backgroundColor: "#555", opacity: 0.6,},
  textoBoton: {color: "#fff", fontSize: 16, fontWeight: "bold",},
  botonVolver: {marginTop: 14, alignItems: "center",},
  textoVolver: {color: "#aaa", fontSize: 14,},
});
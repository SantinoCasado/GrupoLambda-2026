import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import {
  CategoriaProducto,
  validateProductoForm,
  registrarProducto,
  ProductoFormErrors,
} from "../services/productosService";

interface Props {
  categoria: CategoriaProducto;
  onSuccess?: () => void;
}

export default function AltaProductoScreen({ categoria, onSuccess }: Props) {
  const esBebida = categoria === "bebida";

  const config = {
    badge: esBebida ? "🍸 • CANTINERO" : "🍳 • COCINERO",
    titulo: esBebida ? "Alta de Bebida" : "Alta de Plato",
    placeholderNombre: esBebida ? "Ej: Gin Tonic con Frutos Rojos" : "Ej: Pastel de Papa Tradicional",
    placeholderDesc: esBebida
      ? "Ej: Gin macerado artesanalmente, agua tónica premium y rodajas de pomelo."
      : "Ej: Carne vacuna seleccionada, puré de papas gratinado al horno con queso.",
    placeholderTiempo: esBebida ? "Ej: 5" : "Ej: 35",
    placeholderPrecio: esBebida ? "Ej: 4500" : "Ej: 9800",
    botonTexto: esBebida ? "🍸 Agregar Bebida a la Carta" : "🍳 Agregar Plato a la Carta",
  };

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tiempoElaboracion, setTiempoElaboracion] = useState("");
  const [precio, setPrecio] = useState("");
  const [fotos, setFotos] = useState<(string | null)[]>([null, null, null]);

  const [errors, setErrors] = useState<ProductoFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const abrirSelectorFoto = (index: number) => {
    setSelectedSlot(index);
    setModalVisible(true);
  };

  const tomarFoto = async () => {
    setModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso Requerido", "Se requiere permiso de cámara para tomar fotos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && selectedSlot !== null) {
      const actualizadas = [...fotos];
      actualizadas[selectedSlot] = result.assets[0].uri;
      setFotos(actualizadas);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const elegirGaleria = async () => {
    setModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso Requerido", "Se requiere permiso para acceder a la galería.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && selectedSlot !== null) {
      const actualizadas = [...fotos];
      actualizadas[selectedSlot] = result.assets[0].uri;
      setFotos(actualizadas);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSubmit = async () => {
    const formErrors = validateProductoForm(
      { nombre, descripcion, tiempoElaboracion, precio, fotos },
      categoria
    );

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Formulario Incompleto", "Por favor revisa los campos marcados en rojo.");
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await registrarProducto({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        tiempoElaboracionMinutos: Number(tiempoElaboracion),
        precio: Number(precio.replace(",", ".")),
        fotos: fotos as string[],
        categoria,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("¡Éxito!", `"${nombre.trim()}" se registró correctamente en la carta.`);

      setNombre("");
      setDescripcion("");
      setTiempoElaboracion("");
      setPrecio("");
      setFotos([null, null, null]);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error de Carta", error.message || "No se pudo registrar el producto.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>{config.badge}</Text>
        <Text style={styles.title}>{config.titulo}</Text>
        <Text style={styles.subtitle}>Carga los datos y 3 fotografías individuales para la carta.</Text>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          style={[styles.input, errors.nombre ? styles.inputError : null]}
          placeholder={config.placeholderNombre}
          placeholderTextColor="#666"
          value={nombre}
          onChangeText={setNombre}
        />
        {errors.nombre && <Text style={styles.errorText}>{errors.nombre}</Text>}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Descripción e Ingredientes *</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.descripcion ? styles.inputError : null]}
          placeholder={config.placeholderDesc}
          placeholderTextColor="#666"
          multiline
          numberOfLines={3}
          value={descripcion}
          onChangeText={setDescripcion}
        />
        {errors.descripcion && <Text style={styles.errorText}>{errors.descripcion}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Tiempo (min) *</Text>
          <TextInput
            style={[styles.input, errors.tiempoElaboracion ? styles.inputError : null]}
            placeholder={config.placeholderTiempo}
            placeholderTextColor="#666"
            keyboardType="number-pad"
            value={tiempoElaboracion}
            onChangeText={setTiempoElaboracion}
          />
          {errors.tiempoElaboracion && (
            <Text style={styles.errorText}>{errors.tiempoElaboracion}</Text>
          )}
        </View>

        <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Precio ($) *</Text>
          <TextInput
            style={[styles.input, errors.precio ? styles.inputError : null]}
            placeholder={config.placeholderPrecio}
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            value={precio}
            onChangeText={setPrecio}
          />
          {errors.precio && <Text style={styles.errorText}>{errors.precio}</Text>}
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Fotografías (3 obligatorias) *</Text>
        <Text style={styles.helperText}>
          Toca cada contenedor para tomar una foto con la cámara o elegir de la galería.
        </Text>

        {errors.fotos && <Text style={[styles.errorText, { marginBottom: 8 }]}>{errors.fotos}</Text>}

        <View style={styles.fotosGrid}>
          {fotos.map((uri, index) => (
            <View key={index} style={styles.fotoContainer}>
              <Text style={styles.fotoSlotLabel}>Foto #{index + 1}</Text>
              <TouchableOpacity
                style={[styles.fotoSlot, uri ? styles.fotoSlotActive : null]}
                onPress={() => abrirSelectorFoto(index)}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.fotoImage} />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Text style={styles.cameraIcon}>📷</Text>
                    <Text style={styles.placeholderText}>Cargar</Text>
                  </View>
                )}
              </TouchableOpacity>
              {uri && (
                <TouchableOpacity
                  style={styles.btnCambiarFoto}
                  onPress={() => abrirSelectorFoto(index)}
                >
                  <Text style={styles.btnCambiarFotoText}>Cambiar</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading ? styles.submitButtonDisabled : null]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.submitButtonText}>{config.botonTexto}</Text>
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Origen de la Imagen #{selectedSlot !== null ? selectedSlot + 1 : ""}</Text>
            <TouchableOpacity style={styles.modalOption} onPress={tomarFoto}>
              <Text style={styles.modalOptionText}>📸 Tomar Foto con Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={elegirGaleria}>
              <Text style={styles.modalOptionText}>🖼️ Elegir de la Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOption, styles.modalOptionCancel]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalOptionCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  badge: { color: "#F59E0B", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "bold", color: "#FFF" },
  subtitle: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },
  fieldContainer: { marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: "#E5E7EB", fontSize: 14, fontWeight: "600", marginBottom: 6 },
  helperText: { color: "#9CA3AF", fontSize: 12, marginBottom: 10 },
  input: {
    backgroundColor: "#1F2937",
    color: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#374151",
  },
  textArea: { minHeight: 75, textAlignVertical: "top" },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
  fotosGrid: { flexDirection: "row", justifyContent: "space-between" },
  fotoContainer: { width: "31%", alignItems: "center" },
  fotoSlotLabel: { color: "#9CA3AF", fontSize: 12, marginBottom: 4, fontWeight: "600" },
  fotoSlot: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#1F2937",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  fotoSlotActive: { borderStyle: "solid", borderColor: "#F59E0B" },
  fotoImage: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderContainer: { alignItems: "center" },
  cameraIcon: { fontSize: 22, marginBottom: 2 },
  placeholderText: { color: "#9CA3AF", fontSize: 11, fontWeight: "500" },
  btnCambiarFoto: { marginTop: 6, paddingVertical: 2, paddingHorizontal: 8, backgroundColor: "#374151", borderRadius: 4 },
  btnCambiarFotoText: { color: "#FFF", fontSize: 11 },
  submitButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "#1F2937", borderRadius: 12, padding: 20, width: "100%", maxWidth: 320 },
  modalTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  modalOption: { backgroundColor: "#374151", paddingVertical: 12, borderRadius: 8, marginBottom: 10, alignItems: "center" },
  modalOptionText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  modalOptionCancel: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#4B5563", marginTop: 4 },
  modalOptionCancelText: { color: "#9CA3AF", fontSize: 14 },
});
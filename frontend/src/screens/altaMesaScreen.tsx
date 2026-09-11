import React, { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChineseFrame } from "../components/ChineseFrame";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { OptionModal } from "../components/OptionModal";
import QRCode from "react-native-qrcode-svg";
import {
  TipoMesa,
  EstadoMesa,
  Mesa,
  validateMesaForm,
  registrarMesa,
  obtenerMesas,
  actualizarDisponibilidadMesa,
  MesaFormErrors,
} from "../services/mesasService";

export default function AltaMesaScreen() {
  const [tab, setTab] = useState<"alta" | "listado">("alta");
  const [numero, setNumero] = useState("");
  const [comensales, setComensales] = useState("");
  const [tipo, setTipo] = useState<TipoMesa>("estandar");
  const [foto, setFoto] = useState<string | null>(null);

  const [errors, setErrors] = useState<MesaFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [modalFoto, setModalFoto] = useState(false);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    cargarMesas();
  }, [tab]);

  const cargarMesas = async () => {
    const listado = await obtenerMesas();
    setMesas([...listado]);
  };

  const tomarFoto = async () => {
    setModalFoto(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Se requiere permiso para usar la cámara.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!res.canceled) {
      setFoto(res.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const elegirGaleria = async () => {
    setModalFoto(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Se requiere permiso para acceder a la galería.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!res.canceled) {
      setFoto(res.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCrearMesa = async () => {
    const errs = validateMesaForm({ numero, comensales, tipo, foto });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await registrarMesa({
        numero: Number(numero),
        comensales: Number(comensales),
        tipo,
        foto: foto!,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("¡Éxito!", `La Mesa #${numero} fue dada de alta con su código QR.`);
      setNumero("");
      setComensales("");
      setTipo("estandar");
      setFoto(null);
      setTab("listado");
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "No se pudo crear la mesa.");
    } finally {
      setIsLoading(false);
    }
  };

  const cambiarEstado = async (numMesa: number, estadoActual: EstadoMesa) => {
    const nuevoEstado: EstadoMesa =
      estadoActual === "vacia" ? "ocupada" : estadoActual === "ocupada" ? "reservada" : "vacia";

    await actualizarDisponibilidadMesa(numMesa, nuevoEstado);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cargarMesas();
  };

  return (
    <>
      <SafeAreaView className="flex-1">
        <StatusBar style="light" />

        {/* Nombres del equipo */}
        <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 16 }}>
          <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
          <Text className="text-[10px] text-vino/70">Santino Casado</Text>
          <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
          <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
        </View>

        {/* Cabecera idéntica a Alta Empleados */}
        <View className="px-5 pt-4">
          <View className="mb-4">
            <Image
              source={require("../../assets/images/logo-name.png")}
              className="h-16 w-auto self-center"
              resizeMode="contain"
            />
            <Image
              source={require("../../assets/images/separator.png")}
              className="my-2 h-5 w-full"
              resizeMode="contain"
            />
            <ChineseFrame className="mt-2 bg-vino">
              <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza uppercase">
                  Gestión de Mesas y QR
                </Text>
                <Text className="mt-1 text-xs font-semibold text-amber-100">
                  Panel de Control • <Text className="font-extrabold text-mostaza uppercase">Dueño o Supervisor</Text>
                </Text>
              </View>
            </ChineseFrame>
          </View>
        </View>

        {/* Selector de Solapas: Alta vs Listado */}
        <View className="flex-row mx-5 mb-3 bg-[#2b0f14] p-1.5 rounded-2xl border border-mostaza/40">
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-xl items-center mr-1 border ${
              tab === "alta" ? "bg-mostaza border-mostaza" : "bg-vino/60 border-transparent"
            }`}
            onPress={() => setTab("alta")}
          >
            <Text
              style={{ fontFamily: "LaOriental" }}
              className={`text-xs uppercase ${tab === "alta" ? "text-vino font-black" : "text-amber-100/70"}`}
            >
              ➕ Nueva Mesa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-xl items-center ml-1 border ${
              tab === "listado" ? "bg-mostaza border-mostaza" : "bg-vino/60 border-transparent"
            }`}
            onPress={() => setTab("listado")}
          >
            <Text
              style={{ fontFamily: "LaOriental" }}
              className={`text-xs uppercase ${tab === "listado" ? "text-vino font-black" : "text-amber-100/70"}`}
            >
              📋 Ver Mesas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido con Scroll */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {tab === "alta" ? (
            <View className="gap-y-4">
              {/* Número de mesa */}
              <View>
                <Text className="mb-1 text-xs font-bold text-vino">Número de Mesa *</Text>
                <TextInput
                  style={[styles.input, errors.numero ? styles.inputError : null]}
                  placeholder="Ej: 5"
                  placeholderTextColor="#a37e1f"
                  keyboardType="number-pad"
                  value={numero}
                  onChangeText={setNumero}
                />
                {errors.numero && <Text style={styles.errorText}>{errors.numero}</Text>}
              </View>

              {/* Comensales */}
              <View>
                <Text className="mb-1 text-xs font-bold text-vino">Cantidad de Comensales (Máx. 8) *</Text>
                <TextInput
                  style={[styles.input, errors.comensales ? styles.inputError : null]}
                  placeholder="Ej: 4"
                  placeholderTextColor="#a37e1f"
                  keyboardType="number-pad"
                  value={comensales}
                  onChangeText={setComensales}
                />
                {errors.comensales && <Text style={styles.errorText}>{errors.comensales}</Text>}
              </View>

              {/* Tipo de Mesa */}
              <View>
                <Text className="mb-1 text-xs font-bold text-vino">Tipo de Mesa *</Text>
                <View className="flex-row flex-wrap gap-2">
                  {(
                    [
                      { key: "estandar", label: "Estándar" },
                      { key: "vip", label: "VIP 🌟" },
                      { key: "movilidad_reducida", label: "Mov. Reducida ♿" },
                    ] as const
                  ).map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setTipo(item.key)}
                      className={`rounded-xl border px-3 py-2 ${
                        tipo === item.key ? "border-vino bg-mostaza" : "border-mostaza/50 bg-[#FBE9DF]"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          tipo === item.key ? "text-vino" : "text-amber-900"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Foto Individual Centrada */}
              <View className="rounded-2xl border border-mostaza p-3 items-center">
                <Text className="mb-2 text-xs font-bold text-vino">Foto de la Mesa *</Text>
                {errors.foto && <Text style={styles.errorText}>{errors.foto}</Text>}
                <TouchableOpacity
                  style={[styles.fotoSlot, foto ? styles.fotoSlotActive : null]}
                  onPress={() => setModalFoto(true)}
                >
                  {foto ? (
                    <Image source={{ uri: foto }} style={styles.fotoImage} />
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <Text style={styles.cameraIcon}>📸</Text>
                      <Text style={styles.placeholderText}>Cargar Foto</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Botón Alta */}
              <TouchableOpacity
                onPress={handleCrearMesa}
                disabled={isLoading}
                className="mt-2 flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3.5 active:bg-terracota"
              >
                <Image
                  source={require("../../assets/images/sello.png")}
                  className="h-6 w-6 mr-3"
                  resizeMode="contain"
                />
                <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                  {isLoading ? "Guardando..." : "Guardar Mesa y Generar QR"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Solapa de Gestión y Listado */
            <View>
              <Text className="mb-1 text-xs font-bold text-vino">
                Toca el estado de una mesa para alternarlo (Vacía ➔ Ocupada ➔ Reservada).
              </Text>

              {mesas.map((m) => (
                <View key={m.numero} style={styles.cardMesa}>
                  <View style={styles.cardMesaInfo}>
                    <Text style={styles.cardMesaTitle}>Mesa #{m.numero}</Text>
                    <Text style={styles.cardMesaSub}>
                      Capacidad: {m.comensales} comensales • Tipo: {m.tipo.toUpperCase()}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.badgeEstado,
                        m.disponibilidad === "vacia"
                          ? styles.badgeVacia
                          : m.disponibilidad === "ocupada"
                          ? styles.badgeOcupada
                          : styles.badgeReservada,
                      ]}
                      onPress={() => cambiarEstado(m.numero, m.disponibilidad)}
                    >
                      <Text style={styles.badgeEstadoText}>
                        ESTADO: {m.disponibilidad.toUpperCase()} (Tocar para cambiar)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* QR Generado Automáticamente */}
                  <View style={styles.cardMesaQr}>
                    <QRCode
                      value={m.qrCode || `mesa_${m.numero}`}
                      size={65}
                      backgroundColor="#1F2937"
                      color="#FFF"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Modal Cámara / Galería */}
        <OptionModal
          visible={modalFoto}
          titulo="Seleccionar Foto de la Mesa"
          opciones={[
            { etiqueta: "Tomar Foto con Cámara", icono: require("../../assets/images/camera-v.png"), onPress: tomarFoto },
            { etiqueta: "Elegir de la Galería", icono: require("../../assets/images/galery-v.png"), onPress: elegirGaleria },
          ]}
          onCancel={() => setModalFoto(false)}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  content: { padding: 20, paddingBottom: 40 },
  tabContainer: { flexDirection: "row", marginBottom: 20, backgroundColor: "#1F2937", borderRadius: 10, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabBtnActive: { backgroundColor: "#F59E0B" },
  tabBtnText: { color: "#9CA3AF", fontSize: 13, fontWeight: "700" },
  tabBtnTextActive: { color: "#000" },
  header: { marginBottom: 16 },
  badge: { color: "#F59E0B", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  subtitle: { fontSize: 13, color: "#9CA3AF", marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { color: "#E5E7EB", fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "#1F2937", color: "#FFF", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: "#374151" },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
  tipoRow: { flexDirection: "row", justifyContent: "space-between" },
  tipoBtn: { flex: 1, marginHorizontal: 2, paddingVertical: 10, backgroundColor: "#1F2937", borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  tipoBtnActive: { backgroundColor: "#374151", borderColor: "#F59E0B" },
  tipoBtnText: { color: "#9CA3AF", fontSize: 11, fontWeight: "600" },
  tipoBtnTextActive: { color: "#F59E0B" },
  fotoSlot: { width: "100%", height: 180, backgroundColor: "#1F2937", borderRadius: 8, borderWidth: 1, borderColor: "#374151", borderStyle: "dashed", justifyContent: "center", alignItems: "center", overflow: "hidden", marginTop: 4 },
  fotoSlotActive: { borderStyle: "solid", borderColor: "#F59E0B" },
  fotoImage: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderContainer: { alignItems: "center" },
  cameraIcon: { fontSize: 28, marginBottom: 4 },
  placeholderText: { color: "#9CA3AF", fontSize: 13, fontWeight: "500" },
  submitBtn: { backgroundColor: "#F59E0B", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  cardMesa: { backgroundColor: "#1F2937", borderRadius: 10, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#374151" },
  cardMesaInfo: { flex: 1, marginRight: 10 },
  cardMesaTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  cardMesaSub: { color: "#9CA3AF", fontSize: 12, marginVertical: 4 },
  badgeEstado: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, alignSelf: "flex-start", marginTop: 4 },
  badgeVacia: { backgroundColor: "#065F46" },
  badgeOcupada: { backgroundColor: "#991B1B" },
  badgeReservada: { backgroundColor: "#92400E" },
  badgeEstadoText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  cardMesaQr: { backgroundColor: "#111827", padding: 6, borderRadius: 8 },
});
import { Ionicons } from "@expo/vector-icons";
import { type RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ensureConversationForSeller, ensureConversationId } from "../../lib/chat";
import { uploadListingPhoto } from "../../lib/listingPhotoUpload";
import { openMapsChoice } from "../../lib/openMaps";
import { randomUuid } from "../../lib/randomUuid";
import { supabase } from "../../lib/supabase";
import type { BuyerHomeStackParamList } from "../../navigation/home/BuyerHomeStack";
import type { DriverHomeStackParamList } from "../../navigation/home/DriverHomeStack";
import type { SellerHomeStackParamList } from "../../navigation/home/SellerHomeStack";
import { useSession } from "../../providers/SessionProvider";
import { useTimeZone } from "../../providers/TimezoneProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

type AnyListingRoute = RouteProp<
  BuyerHomeStackParamList | SellerHomeStackParamList | DriverHomeStackParamList,
  "ListingDetail"
>;
type AnyNav = NativeStackNavigationProp<
  BuyerHomeStackParamList | SellerHomeStackParamList | DriverHomeStackParamList
>;

type ListingRow = {
  id: string;
  user_id: string;
  title?: string | null;
  waste_type: string;
  quantity: string;
  description: string | null;
  images: string[] | null;
  address: string;
  asking_price: string | number;
  currency: string;
  status: string;
  delivery_required: boolean;
  delivery_fee: string | number | null;
  pickup_job_status: string;
  assigned_driver_id: string | null;
  accepted_by: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_privacy_locked?: boolean | null;
  buyer_delivery_confirmed?: boolean | null;
  updated_at?: string;
};

type OfferMini = { id: string; amount: string | number; currency: string; status: string };
type OfferRowFull = {
  id: string;
  buyer_id: string;
  amount: string | number;
  currency: string;
  status: string;
  created_at: string;
};

export function ListingDetailScreen() {
  const route = useRoute<AnyListingRoute>();
  const navigation = useNavigation<AnyNav>();
  const { state } = useSession();
  const { formatDateTime } = useTimeZone();
  const me = state.status === "signed_in" ? state.session.user.id : null;
  const role = state.status === "signed_in" ? state.role : null;

  const id = route.params.id;
  const [row, setRow] = useState<ListingRow | null>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [sellerAvatar, setSellerAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [myPending, setMyPending] = useState<OfferMini | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [handoffPin, setHandoffPin] = useState<string | null>(null);
  const [offersForSeller, setOffersForSeller] = useState<OfferRowFull[]>([]);
  const [partyProfiles, setPartyProfiles] = useState<Record<string, { name: string | null; avatar_url: string | null }>>({});
  const [editTitle, setEditTitle] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editBusy, setEditBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: listing, error: e1 } = await supabase.from("waste_listings").select("*").eq("id", id).maybeSingle();
    if (e1) {
      setError(e1.message);
      setRow(null);
      setLoading(false);
      return;
    }
    if (!listing) {
      setError("Listing not found or you do not have access.");
      setRow(null);
      setLoading(false);
      return;
    }
    const L = listing as ListingRow;
    setRow(L);
    setOfferAmount(String(L.asking_price ?? ""));

    const { data: prof } = await supabase.from("user_public_profiles").select("name,avatar_url").eq("id", L.user_id).maybeSingle();
    setSellerName((prof as { name?: string } | null)?.name ?? "Seller");
    setSellerAvatar((prof as { avatar_url?: string | null } | null)?.avatar_url ?? null);

    const partyIds = new Set<string>();
    if (L.accepted_by) partyIds.add(L.accepted_by);
    if (L.assigned_driver_id) partyIds.add(L.assigned_driver_id);

    if (me && L.user_id === me) {
      const { data: offers } = await supabase
        .from("offers")
        .select("id,buyer_id,amount,currency,status,created_at")
        .eq("listing_id", id)
        .order("created_at", { ascending: false });
      const list = (offers as OfferRowFull[] | null) ?? [];
      setOffersForSeller(list);
      for (const o of list) partyIds.add(o.buyer_id);
    } else {
      setOffersForSeller([]);
    }

    if (partyIds.size) {
      const { data: profs } = await supabase
        .from("user_public_profiles")
        .select("id,name,avatar_url")
        .in("id", [...partyIds]);
      const pm: Record<string, { name: string | null; avatar_url: string | null }> = {};
      for (const p of (profs as { id: string; name: string | null; avatar_url: string | null }[] | null) ?? []) {
        pm[p.id] = { name: p.name, avatar_url: p.avatar_url };
      }
      setPartyProfiles(pm);
    } else {
      setPartyProfiles({});
    }

    if (me && role === "buyer") {
      const { data: offers } = await supabase
        .from("offers")
        .select("id,amount,currency,status")
        .eq("listing_id", id)
        .eq("buyer_id", me)
        .order("created_at", { ascending: false });
      const list = (offers as OfferMini[] | null) ?? [];
      setMyPending(list.find((o) => o.status === "pending") ?? null);
    } else {
      setMyPending(null);
    }

    let pin: string | null = null;
    if (me && role !== "driver" && (L.accepted_by === me || L.user_id === me)) {
      const { data: sec } = await supabase
        .from("delivery_handoff_secrets")
        .select("pin,consumed_at")
        .eq("listing_id", id)
        .maybeSingle();
      const s = sec as { pin?: string; consumed_at?: string | null } | null;
      if (s?.pin && !s.consumed_at) pin = s.pin;
    }
    setHandoffPin(pin);

    setLoading(false);
  }, [id, me, role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!row) return;
    setEditTitle(String(row.title ?? "").trim());
    setEditQuantity(row.quantity);
    setEditDescription(row.description ?? "");
    setEditAddress(row.address);
    setEditPrice(String(row.asking_price ?? ""));
    setEditImages((row.images ?? []).filter((u): u is string => typeof u === "string" && u.length > 0));
  }, [row]);

  const isBuyer = role === "buyer";
  const isSellerView = me && row && row.user_id === me;

  const canManageListing = useMemo(() => {
    if (!row || !me) return false;
    if (row.user_id !== me) return false;
    return row.status !== "completed" && row.status !== "cancelled";
  }, [row, me]);

  const canTrack = useMemo(() => {
    if (!row || !me) return false;
    if (!row.delivery_required) return false;
    if (!row.assigned_driver_id) return false;
    if (row.user_id === me) return true;
    if (row.accepted_by === me) return true;
    if (row.assigned_driver_id === me) return true;
    return false;
  }, [row, me]);

  const canDriverClaim = useMemo(() => {
    if (!row || role !== "driver") return false;
    if (!row.delivery_required) return false;
    if (!row.buyer_delivery_confirmed) return false;
    if (row.pickup_job_status !== "available") return false;
    if (row.assigned_driver_id) return false;
    return ["open", "accepted", "reopened"].includes(row.status);
  }, [row, role]);

  const headline = useMemo(() => {
    if (!row) return "";
    if (row.title?.trim()) return row.title.trim();
    return `${String(row.waste_type).replaceAll("_", " ")} · ${row.quantity}`;
  }, [row]);

  const showAddress = useMemo(() => {
    if (!row) return true;
    if (role !== "driver") return true;
    if (row.delivery_privacy_locked) return false;
    if (row.delivery_required && !row.buyer_delivery_confirmed) return false;
    return true;
  }, [row, role]);

  const addressPlaceholder = useMemo(() => {
    if (!row || role !== "driver") return "";
    if (row.delivery_privacy_locked) return "Pickup address is hidden after verified delivery. Use in-app chat.";
    if (row.delivery_required && !row.buyer_delivery_confirmed) {
      return "Full address unlocks after the buyer releases this pickup to drivers.";
    }
    return "";
  }, [row, role]);

  async function openChat() {
    if (!me || !isBuyer || !row) return;
    if (row.user_id === me) {
      Alert.alert("Chat", "You cannot message yourself on your own listing.");
      return;
    }
    const conv = await ensureConversationId(id, me);
    if (!conv.ok) {
      Alert.alert("Chat unavailable", conv.message || "Could not create or load a conversation thread.");
      return;
    }
    (navigation as any).getParent()?.navigate?.("Messages", {
      screen: "ChatThread",
      params: { conversationId: conv.conversationId, title: headline || sellerName || "Seller chat" },
    });
  }

  async function sellerOpenChatWithBuyer(buyerId: string, buyerName: string) {
    if (!row) return;
    const conv = await ensureConversationForSeller(row.id, buyerId);
    if (!conv.ok) {
      Alert.alert("Chat unavailable", conv.message || "Could not create or load a conversation thread.");
      return;
    }
    (navigation as any).getParent()?.navigate?.("Messages", {
      screen: "ChatThread",
      params: { conversationId: conv.conversationId, title: buyerName || "Buyer chat" },
    });
  }

  async function submitOffer(atAsking?: boolean) {
    if (!me || !row || row.status !== "open") return;
    if (row.user_id === me) {
      Alert.alert("Offers", "You cannot place an offer on your own listing.");
      return;
    }
    const raw = atAsking ? String(row.asking_price) : offerAmount;
    const amt = Number(String(raw).replace(/,/g, "").trim());
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Enter a positive offer amount.");
      return;
    }
    const cur = row.currency ?? "USD";
    setBusy(true);
    try {
      if (myPending) {
        const { error } = await supabase
          .from("offers")
          .update({ amount: amt, currency: cur, updated_at: new Date().toISOString() })
          .eq("id", myPending.id);
        if (error) throw error;
      } else {
        const now = new Date().toISOString();
        const { error } = await supabase.from("offers").insert({
          id: randomUuid(),
          listing_id: id,
          buyer_id: me,
          amount: amt,
          currency: cur,
          status: "pending",
          created_at: now,
          updated_at: now,
        });
        if (error) throw error;
      }
      Alert.alert("Offer sent", "The seller will be notified.");
      await load();
    } catch (e: any) {
      Alert.alert("Offer failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function withdrawOffer() {
    if (!me || !myPending) return;
    setBusy(true);
    const { error } = await supabase.from("offers").update({ status: "withdrawn" }).eq("id", myPending.id).eq("buyer_id", me);
    setBusy(false);
    if (error) Alert.alert("Withdraw failed", error.message);
    else void load();
  }

  async function confirmBuyerMarketplaceDelivery() {
    if (!row || !me) return;
    setConfirmBusy(true);
    try {
      const { data, error } = await supabase.rpc("buyer_confirm_marketplace_delivery", { p_listing_id: row.id });
      if (error) {
        Alert.alert("Could not confirm", error.message);
        return;
      }
      if (data && typeof data === "object" && (data as any).ok === false) {
        Alert.alert("Could not confirm", String((data as any).error ?? "unknown"));
        return;
      }
      Alert.alert("Drivers notified", "Drivers can now see and claim this pickup.");
      await load();
    } finally {
      setConfirmBusy(false);
    }
  }

  async function claimJob() {
    if (!row) return;
    setClaimBusy(true);
    try {
      const { data, error } = await supabase.rpc("driver_claim_pickup", { p_listing_id: row.id });
      if (error) {
        Alert.alert("Claim failed", error.message);
        return;
      }
      if (data && typeof data === "object" && (data as any).ok === false) {
        const code = String((data as any).error ?? "unknown");
        Alert.alert(
          "Claim failed",
          code === "awaiting_buyer_delivery_confirm"
            ? "The buyer has not released this pickup to drivers yet."
            : code,
        );
        return;
      }
      Alert.alert("Pickup claimed", "You’re assigned to this job.");
      await load();
      navigation.navigate("LiveTrack", { listingId: row.id });
    } finally {
      setClaimBusy(false);
    }
  }

  async function saveSellerListing() {
    if (!row || !me || row.user_id !== me) return;
    const t = editTitle.trim();
    if (!t) {
      Alert.alert("Listing name", "Enter a short name for this listing.");
      return;
    }
    const q = editQuantity.trim();
    if (!q) {
      Alert.alert("Quantity", "Quantity is required.");
      return;
    }
    const addr = editAddress.trim();
    if (!addr) {
      Alert.alert("Address", "Address is required.");
      return;
    }
    const price = Number(String(editPrice).replace(/,/g, "").trim());
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert("Price", "Enter a valid asking price.");
      return;
    }
    if (editImages.length < 1) {
      Alert.alert("Photos", "Keep at least one listing photo.");
      return;
    }
    setEditBusy(true);
    try {
      const { error } = await supabase
        .from("waste_listings")
        .update({
          title: t,
          quantity: q,
          description: editDescription.trim() || null,
          address: addr,
          asking_price: price,
          images: editImages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) throw error;
      Alert.alert("Saved", "Your listing was updated.");
      await load();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    } finally {
      setEditBusy(false);
    }
  }

  async function addListingPhotos() {
    if (!me) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Allow photo library access to add images.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets?.length) return;
    setPhotoBusy(true);
    try {
      const urls: string[] = [];
      for (const a of picked.assets) {
        urls.push(await uploadListingPhoto(me, a.uri));
      }
      setEditImages((prev) => [...prev, ...urls]);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Unknown error");
    } finally {
      setPhotoBusy(false);
    }
  }

  function removeListingPhoto(uri: string) {
    setEditImages((prev) => prev.filter((u) => u !== uri));
  }

  function cancelListingFromMarketplace() {
    if (!row || !me || row.user_id !== me) return;
    Alert.alert(
      "Remove listing",
      "This will mark the listing as cancelled and hide it from the marketplace. Continue?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, remove",
          style: "destructive",
          onPress: async () => {
            setEditBusy(true);
            try {
              const { error } = await supabase
                .from("waste_listings")
                .update({ status: "cancelled", updated_at: new Date().toISOString() })
                .eq("id", row.id);
              if (error) throw error;
              await load();
            } catch (e: any) {
              Alert.alert("Could not cancel", e?.message ?? "Unknown error");
            } finally {
              setEditBusy(false);
            }
          },
        },
      ],
    );
  }

  const images = row?.images?.filter((u) => typeof u === "string" && u.length > 0) ?? [];

  return (
    <GradientScreen decorated>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : error ? (
          <GlassCard>
            <Text style={styles.title}>Unable to load listing</Text>
            <Text style={styles.muted}>{error}</Text>
          </GlassCard>
        ) : !row ? (
          <Text style={styles.muted}>Not found.</Text>
        ) : (
          <>
            <GlassCard>
              <Text style={styles.kicker}>{String(row.waste_type).replaceAll("_", " ")}</Text>
              <Text style={styles.h1}>{headline}</Text>
              {row.title?.trim() ? <Text style={styles.muted}>{row.quantity}</Text> : null}
              {row.description ? <Text style={styles.body}>{row.description}</Text> : null}
              <Text style={styles.muted}>{showAddress ? row.address : addressPlaceholder}</Text>
              <View style={styles.row}>
                <Text style={styles.price}>
                  {String(row.asking_price)} {row.currency}
                </Text>
                <Text style={styles.pill}>{row.status}</Text>
              </View>
              {row.delivery_required ? (
                <Text style={[styles.muted, { marginTop: 8 }]}>
                  Delivery available — fee {String(row.delivery_fee ?? "0")} {row.currency}
                </Text>
              ) : (
                <Text style={[styles.muted, { marginTop: 8 }]}>Buyer pickup (no marketplace delivery)</Text>
              )}
              {role === "driver" &&
              row.delivery_required &&
              !row.buyer_delivery_confirmed &&
              ["open", "accepted", "reopened"].includes(row.status) ? (
                <Text style={[styles.muted, { marginTop: 10 }]}>
                  This pickup is not claimable until the buyer confirms they are ready for drivers.
                </Text>
              ) : null}
            </GlassCard>

            {isBuyer &&
            row.status === "accepted" &&
            row.delivery_required &&
            !row.buyer_delivery_confirmed &&
            row.accepted_by === me ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Release pickup to drivers</Text>
                <Text style={styles.muted}>
                  After you and the seller agree on timing in chat, confirm here so drivers can claim this job.
                </Text>
                <Pressable
                  style={[styles.primaryBtn, { marginTop: 12 }]}
                  disabled={confirmBusy}
                  onPress={() => void confirmBuyerMarketplaceDelivery()}
                >
                  <Ionicons name="rocket" color="white" size={18} />
                  <Text style={styles.primaryBtnText}>{confirmBusy ? "Confirming…" : "I’m ready — show drivers"}</Text>
                </Pressable>
              </GlassCard>
            ) : null}

            {row.status === "accepted" && row.delivery_required && handoffPin && role !== "driver" ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Delivery PIN</Text>
                <Text style={styles.muted}>Share this code with your driver so they can mark the job complete.</Text>
                <Text style={styles.pin}>{handoffPin}</Text>
              </GlassCard>
            ) : null}

            {isSellerView && row.status === "accepted" && row.delivery_required && !row.buyer_delivery_confirmed ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Driver pickup</Text>
                <Text style={styles.muted}>The buyer has not released this listing to drivers yet. They will confirm when ready.</Text>
              </GlassCard>
            ) : null}

            {images.length ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 10 }}>
                  {images.map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.photo} />
                  ))}
                </ScrollView>
              </GlassCard>
            ) : null}

            {!isSellerView ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Seller</Text>
                <Pressable
                  style={styles.personRow}
                  onPress={() => navigation.navigate("PublicProfile", { id: row.user_id, title: sellerName ?? "Seller" })}
                >
                  {sellerAvatar ? (
                    <Image source={{ uri: sellerAvatar }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(sellerName ?? "?").slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{sellerName ?? "Seller"}</Text>
                    <Text style={styles.muted}>Tap to view profile & reviews</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.65)" />
                </Pressable>
              </GlassCard>
            ) : (
              <>
                <GlassCard style={{ marginTop: 12 }}>
                  <Text style={styles.section}>Your listing</Text>
                  <Text style={styles.muted}>
                    You’re the seller. Offers from all interested buyers appear below; open chat with any buyer to coordinate pickup.
                  </Text>
                </GlassCard>
                {canManageListing ? (
                  <GlassCard style={{ marginTop: 12 }}>
                    <Text style={styles.section}>Edit listing</Text>
                    <Text style={styles.muted}>Update text or photos until the sale is completed. At least one photo is required.</Text>
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Listing name *</Text>
                    <TextInput
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Short name buyers recognize"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      style={styles.editInput}
                    />
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Quantity *</Text>
                    <TextInput
                      value={editQuantity}
                      onChangeText={setEditQuantity}
                      placeholder="e.g. 2 pallets"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      style={styles.editInput}
                    />
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Description</Text>
                    <TextInput
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder="Optional"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      style={[styles.editInput, styles.editMultiline]}
                      multiline
                    />
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Address *</Text>
                    <TextInput
                      value={editAddress}
                      onChangeText={setEditAddress}
                      placeholder="Pickup address"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      style={[styles.editInput, styles.editMultiline]}
                      multiline
                    />
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Asking price ({row.currency}) *</Text>
                    <TextInput
                      value={editPrice}
                      onChangeText={setEditPrice}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      style={styles.editInput}
                    />
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Photos *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 10 }}>
                      {editImages.map((uri) => (
                        <View key={uri} style={styles.thumbEditWrap}>
                          <Image source={{ uri }} style={styles.thumbEdit} />
                          <Pressable style={styles.thumbRemove} onPress={() => removeListingPhoto(uri)}>
                            <Ionicons name="close" size={16} color="white" />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                    <Pressable
                      style={[styles.secondaryBtn, { marginTop: 12, opacity: photoBusy ? 0.6 : 1 }]}
                      disabled={photoBusy}
                      onPress={() => void addListingPhotos()}
                    >
                      {photoBusy ? <ActivityIndicator color="white" /> : <Text style={styles.secondaryBtnText}>Add photos</Text>}
                    </Pressable>
                    <Pressable
                      style={[styles.primaryBtn, { marginTop: 14, opacity: editBusy ? 0.6 : 1 }]}
                      disabled={editBusy}
                      onPress={() => void saveSellerListing()}
                    >
                      {editBusy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Save changes</Text>}
                    </Pressable>
                    <Pressable
                      style={[styles.dangerOutline, { marginTop: 12 }]}
                      disabled={editBusy}
                      onPress={cancelListingFromMarketplace}
                    >
                      <Text style={styles.dangerOutlineText}>Remove from marketplace</Text>
                    </Pressable>
                  </GlassCard>
                ) : row.status === "completed" ? (
                  <GlassCard style={{ marginTop: 12 }}>
                    <Text style={styles.muted}>This listing is completed. It can’t be edited or removed from here.</Text>
                  </GlassCard>
                ) : null}
              </>
            )}

            {isSellerView && offersForSeller.length ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Buyer offers ({offersForSeller.length})</Text>
                <Text style={styles.muted}>Multiple buyers can submit offers while the listing is open. Accept offers on the web seller dashboard.</Text>
                {offersForSeller.map((o, idx) => {
                  const bp = partyProfiles[o.buyer_id];
                  const nm = bp?.name ?? "Buyer";
                  const av = bp?.avatar_url;
                  return (
                    <View key={o.id} style={idx === 0 ? { marginTop: 10 } : styles.offerDivider}>
                      <Pressable style={styles.personRow} onPress={() => navigation.navigate("PublicProfile", { id: o.buyer_id, title: nm })}>
                        {av ? (
                          <Image source={{ uri: av }} style={styles.avatarImg} />
                        ) : (
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{nm.slice(0, 1).toUpperCase()}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personName}>{nm}</Text>
                          <Text style={styles.muted}>
                            {String(o.amount)} {o.currency} · {o.status} · {formatDateTime(o.created_at)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.65)" />
                      </Pressable>
                      <Pressable style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={() => void sellerOpenChatWithBuyer(o.buyer_id, nm)}>
                        <Ionicons name="chatbubbles" color="white" size={18} />
                        <Text style={styles.secondaryBtnText}>Message buyer</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </GlassCard>
            ) : null}

            {row.accepted_by ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Accepted buyer</Text>
                <Pressable
                  style={styles.personRow}
                  onPress={() =>
                    navigation.navigate("PublicProfile", {
                      id: row.accepted_by!,
                      title: partyProfiles[row.accepted_by!]?.name ?? "Buyer",
                    })
                  }
                >
                  {partyProfiles[row.accepted_by!]?.avatar_url ? (
                    <Image source={{ uri: partyProfiles[row.accepted_by!]!.avatar_url! }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(partyProfiles[row.accepted_by!]?.name ?? "?").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{partyProfiles[row.accepted_by!]?.name ?? "Buyer"}</Text>
                    <Text style={styles.muted}>Tap to view profile</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.65)" />
                </Pressable>
                {isSellerView ? (
                  <Pressable
                    style={[styles.secondaryBtn, { marginTop: 12 }]}
                    onPress={() =>
                      void sellerOpenChatWithBuyer(
                        row.accepted_by!,
                        partyProfiles[row.accepted_by!]?.name ?? "Buyer",
                      )
                    }
                  >
                    <Ionicons name="chatbubbles" color="white" size={18} />
                    <Text style={styles.secondaryBtnText}>Message buyer</Text>
                  </Pressable>
                ) : null}
              </GlassCard>
            ) : null}

            {row.assigned_driver_id ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Driver</Text>
                <Pressable
                  style={styles.personRow}
                  onPress={() =>
                    navigation.navigate("PublicProfile", {
                      id: row.assigned_driver_id!,
                      title: partyProfiles[row.assigned_driver_id!]?.name ?? "Driver",
                    })
                  }
                >
                  <Ionicons name="car" size={20} color="#B7FFD0" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.personName}>{partyProfiles[row.assigned_driver_id!]?.name ?? "Assigned driver"}</Text>
                    <Text style={styles.muted}>Tap to view profile</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.65)" />
                </Pressable>
              </GlassCard>
            ) : null}

            {isBuyer && row.status === "open" && !isSellerView ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Make an offer</Text>
                <Text style={styles.muted}>Submit at asking price or enter your amount. Seller accepts offers on web.</Text>
                <TextInput
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                  keyboardType="decimal-pad"
                  placeholder="Offer amount"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={styles.input}
                />
                <View style={{ gap: 10, marginTop: 12 }}>
                  <Pressable style={styles.primaryBtn} disabled={busy} onPress={() => void submitOffer(false)}>
                    <Ionicons name="pricetag" color="white" size={18} />
                    <Text style={styles.primaryBtnText}>{busy ? "Sending…" : "Submit offer"}</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryBtn} disabled={busy} onPress={() => void submitOffer(true)}>
                    <Text style={styles.secondaryBtnText}>Offer asking price</Text>
                  </Pressable>
                </View>
                {myPending ? (
                  <Text style={[styles.muted, { marginTop: 12 }]}>
                    Pending offer: {String(myPending.amount)} {myPending.currency}.{" "}
                    <Text style={styles.link} onPress={() => void withdrawOffer()}>
                      Withdraw
                    </Text>
                  </Text>
                ) : null}
              </GlassCard>
            ) : null}

            {canDriverClaim ? (
              <Pressable style={styles.primaryBtn} disabled={claimBusy} onPress={() => void claimJob()}>
                <Ionicons name="checkmark-circle" color="white" size={20} />
                <Text style={styles.primaryBtnText}>{claimBusy ? "Claiming…" : "Accept pickup job"}</Text>
              </Pressable>
            ) : null}

            {role === "driver" && row.delivery_required && (row.assigned_driver_id === me || canDriverClaim) ? (
              <Pressable
                style={[styles.secondaryBtn, { marginTop: 12 }]}
                onPress={() => openMapsChoice(row.latitude, row.longitude, row.address, headline || "Pickup")}
              >
                <Ionicons name="navigate" color="white" size={18} />
                <Text style={styles.secondaryBtnText}>Directions to pickup</Text>
              </Pressable>
            ) : null}

            <View style={styles.actions}>
              {isBuyer && !isSellerView ? (
                <Pressable style={styles.primaryBtn} onPress={() => void openChat()}>
                  <Ionicons name="chatbubbles" color="white" size={18} />
                  <Text style={styles.primaryBtnText}>Message seller</Text>
                </Pressable>
              ) : null}

              {canTrack ? (
                <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("LiveTrack", { listingId: id })}>
                  <Ionicons name="map" color="white" size={18} />
                  <Text style={styles.secondaryBtnText}>Track pickup</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 36 },
  kicker: { color: "rgba(255,255,255,0.65)", fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", fontSize: 12 },
  h1: { color: "white", fontSize: 26, fontWeight: "900", marginTop: 8 },
  body: { color: "rgba(255,255,255,0.82)", marginTop: 10, lineHeight: 22, fontWeight: "600" },
  muted: { color: "rgba(255,255,255,0.65)", marginTop: 8, lineHeight: 18, fontWeight: "600" },
  title: { color: "white", fontSize: 18, fontWeight: "900" },
  row: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  price: { color: "white", fontSize: 18, fontWeight: "900" },
  pill: { color: "rgba(255,255,255,0.85)", fontWeight: "900", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.25)" },
  section: { color: "rgba(255,255,255,0.65)", fontWeight: "900", marginBottom: 4 },
  pin: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 6,
    color: "#FFE08A",
  },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarImg: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.2)" },
  avatarText: { color: "white", fontWeight: "900" },
  personName: { color: "white", fontWeight: "900", fontSize: 16 },
  photo: { width: 220, height: 140, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.25)" },
  input: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    color: "white",
    fontWeight: "700",
  },
  link: { color: "#FFB4BD", fontWeight: "900", textDecorationLine: "underline" },
  actions: { marginTop: 16, gap: 12 },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(91,140,255,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 52,
  },
  primaryBtnText: { color: "white", fontWeight: "900" },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(35,213,171,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(35,213,171,0.35)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 52,
  },
  secondaryBtnText: { color: "white", fontWeight: "900" },
  offerDivider: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  fieldLabel: { color: "rgba(255,255,255,0.75)", fontWeight: "800", fontSize: 12 },
  editInput: {
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    color: "white",
    fontWeight: "700",
  },
  editMultiline: { minHeight: 72, textAlignVertical: "top" },
  thumbEditWrap: { position: "relative" },
  thumbEdit: { width: 88, height: 88, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.25)" },
  thumbRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerOutline: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,180,190,0.85)",
  },
  dangerOutlineText: { color: "#FFB4BD", fontWeight: "900" },
});

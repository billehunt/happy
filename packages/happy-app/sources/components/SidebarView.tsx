import * as React from 'react';
import { Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHeaderHeight } from '@/utils/responsive';
import { VoiceAssistantStatusBar } from './VoiceAssistantStatusBar';
import { useRealtimeStatus, useSingleSessionHost } from '@/sync/storage';
import { MainView } from './MainView';
import { StyleSheet } from 'react-native-unistyles';
import { t } from '@/text';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        borderStyle: 'solid',
        backgroundColor: theme.colors.groupped.background,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.divider,
    },
    // Reuses the top header band (whose left cluster is the shared zen/back/
    // forward overlay) — New session + host sit on its otherwise-empty right.
    topBand: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10,
        paddingLeft: 12,
        paddingRight: 16,
    },
    hostPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 1,
        minWidth: 0,
        maxWidth: 96,
    },
    hostPillText: {
        fontSize: 11.5,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    newSessionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: theme.colors.radio.active,
        gap: 6,
        shadowColor: theme.colors.radio.active,
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 1 },
    },
    newSessionButtonPressed: {
        opacity: 0.9,
    },
    newSessionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
        ...Typography.default('semiBold'),
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.divider,
        gap: 10,
    },
    settingsText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        ...Typography.default(),
    },
}));

export const SidebarView = React.memo(() => {
    const styles = stylesheet;
    const safeArea = useSafeAreaInsets();
    const router = useRouter();
    const headerHeight = useHeaderHeight();
    const realtimeStatus = useRealtimeStatus();
    const singleHost = useSingleSessionHost();

    const handleNewSession = React.useCallback(() => {
        router.navigate('/new');
    }, [router]);

    return (
        <View style={styles.container}>
            {/* Top band: shares the header row with the zen/back/forward overlay */}
            <View style={[styles.topBand, { paddingTop: safeArea.top, height: safeArea.top + headerHeight }]}>
                {singleHost && (
                    <View style={styles.hostPill}>
                        <Ionicons name="desktop-outline" size={12} color={stylesheet.hostPillText.color} />
                        <Text style={styles.hostPillText} numberOfLines={1}>{singleHost}</Text>
                    </View>
                )}
                <Pressable
                    onPress={handleNewSession}
                    style={({ pressed }) => [
                        styles.newSessionButton,
                        pressed && styles.newSessionButtonPressed,
                    ]}
                >
                    <Ionicons name="add" size={16} color={stylesheet.newSessionText.color} />
                    <Text style={styles.newSessionText}>{t('sidebar.newSession')}</Text>
                </Pressable>
            </View>

            {realtimeStatus !== 'disconnected' && (
                <VoiceAssistantStatusBar variant="sidebar" />
            )}

            {/* Sessions list */}
            <MainView variant="sidebar" />

            {/* Settings at bottom */}
            <Pressable
                onPress={() => router.push('/settings')}
                style={styles.settingsRow}
            >
                <Ionicons name="settings-outline" size={18} color={stylesheet.settingsText.color} />
                <Text style={styles.settingsText}>{t('settings.title')}</Text>
            </Pressable>
        </View>
    );
});

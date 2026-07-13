import React from 'react';
import { View, Pressable, FlatList, Platform, TextInput } from 'react-native';
import { Text } from '@/components/StyledText';
import { usePathname } from 'expo-router';
import { SessionListViewItem, SessionRowData, useSessionListViewData, useLocalSettingMutable } from '@/sync/storage';
import { Ionicons } from '@expo/vector-icons';
import { type SessionState, formatLastSeen, vibingMessages } from '@/utils/sessionUtils';
import { Avatar } from './Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '@/constants/Typography';
import { StatusDot } from './StatusDot';
import { StyleSheet } from 'react-native-unistyles';
import { useIsTablet } from '@/utils/responsive';
import { requestReview } from '@/utils/requestReview';
import { UpdateBanner } from './UpdateBanner';
import { layout } from './layout';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { SessionActionsAnchor, SessionActionsPopover } from './SessionActionsPopover';
import { useSessionActionAlert } from '@/hooks/useSessionQuickActions';
import { SessionListControls } from './SessionListControls';
import { t } from '@/text';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        flex: 1,
        maxWidth: layout.maxWidth,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 6,
    },
    groupHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.groupped.sectionTitle,
        letterSpacing: 0.1,
        ...Typography.default('semiBold'),
    },
    groupHeaderSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        flexShrink: 1,
        ...Typography.default(),
    },
    groupHeaderCount: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.surface,
        borderRadius: 9,
        paddingHorizontal: 7,
        paddingVertical: 1,
        overflow: 'hidden',
        marginLeft: 'auto',
        ...Typography.default(),
    },
    sessionItem: {
        height: 88,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
    },
    sessionItemContainer: {
        marginHorizontal: 16,
        marginBottom: 1,
        overflow: 'hidden',
    },
    sessionItemFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    sessionItemLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    sessionItemSingle: {
        borderRadius: 12,
    },
    sessionItemContainerFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    sessionItemContainerLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 12,
    },
    sessionItemContainerSingle: {
        borderRadius: 12,
        marginBottom: 12,
    },
    sessionItemSelected: {
        backgroundColor: theme.colors.surfaceSelected,
    },
    sessionContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    sessionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    sessionTitle: {
        fontSize: 15,
        fontWeight: '500',
        flexShrink: 1,
        ...Typography.default('semiBold'),
    },
    // AI-generated summaries render lighter than user-chosen names so renamed
    // sessions stand out in a long list
    sessionTitleAI: {
        fontWeight: '400',
        ...Typography.default(),
    },
    sessionTitleConnected: {
        color: theme.colors.text,
    },
    sessionTitleDisconnected: {
        color: theme.colors.textSecondary,
    },
    pinIcon: {
        color: theme.colors.textSecondary,
    },
    archivedBadge: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.4,
        color: theme.colors.textSecondary,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.divider,
        borderRadius: 5,
        paddingHorizontal: 5,
        paddingVertical: 1,
        overflow: 'hidden',
        ...Typography.default('semiBold'),
    },
    sessionSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    sessionSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        flexShrink: 1,
        ...Typography.default(),
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDotContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 16,
        marginTop: 2,
        marginRight: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
        ...Typography.default(),
    },
    avatarContainer: {
        position: 'relative',
        width: 48,
        height: 48,
    },
    draftIconContainer: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    draftIconOverlay: {
        color: theme.colors.textSecondary,
    },
    emptySearch: {
        paddingHorizontal: 24,
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptySearchText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        ...Typography.default(),
    },
}));

function sessionMatchesQuery(session: SessionRowData, query: string): boolean {
    const haystack = `${session.name} ${session.path ?? ''} ${session.host ?? ''}`.toLowerCase();
    return haystack.includes(query);
}

export function SessionsList() {
    const styles = stylesheet;
    const safeArea = useSafeAreaInsets();
    const data = useSessionListViewData();
    const pathname = usePathname();
    const isTablet = useIsTablet();
    const [query, setQuery] = React.useState('');
    const searchInputRef = React.useRef<TextInput>(null);
    const [collapsedGroups, setCollapsedGroups] = useLocalSettingMutable('collapsedSessionGroups');

    // The archived group defaults to collapsed; everything else to expanded
    const isGroupCollapsed = React.useCallback((key: string, kind: string) => {
        return collapsedGroups[key] ?? (kind === 'archived');
    }, [collapsedGroups]);

    const toggleGroup = React.useCallback((key: string, kind: string) => {
        setCollapsedGroups({ ...collapsedGroups, [key]: !isGroupCollapsed(key, kind) });
    }, [collapsedGroups, isGroupCollapsed, setCollapsedGroups]);

    // "/" focuses search (web only). Skipped while any other field has focus.
    React.useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
            e.preventDefault();
            searchInputRef.current?.focus();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Search flattens the list (archived included — rows carry a badge);
    // otherwise drop rows of collapsed groups.
    const visibleData = React.useMemo<SessionListViewItem[] | null>(() => {
        if (!data) return data;
        const normalizedQuery = query.trim().toLowerCase();
        if (normalizedQuery) {
            return data.filter(item =>
                item.type === 'session' && sessionMatchesQuery(item.session, normalizedQuery));
        }
        const result: SessionListViewItem[] = [];
        for (const item of data) {
            if (item.type === 'group') {
                result.push(item);
            } else if (item.groupKey === 'all' || !isGroupCollapsed(item.groupKey, item.groupKey === 'archived' ? 'archived' : '')) {
                result.push(item);
            }
        }
        return result;
    }, [data, query, isGroupCollapsed]);

    // Selection is derived once from pathname so the data array stays stable
    // across navigations. This keeps FlatList virtualization intact: only
    // the previously- and newly-selected rows re-render, instead of the
    // whole visible window.
    const selectedSessionId = React.useMemo<string | undefined>(() => {
        if (!isTablet) return undefined;
        if (!pathname.startsWith('/session/')) return undefined;
        return pathname.split('/')[2];
    }, [isTablet, pathname]);

    // Request review
    React.useEffect(() => {
        if (data && data.length > 0) {
            requestReview();
        }
    }, [data && data.length > 0]);

    const keyExtractor = React.useCallback((item: SessionListViewItem) => {
        switch (item.type) {
            case 'group': return `group-${item.key}`;
            case 'session': return `session-${item.session.id}`;
        }
    }, []);

    const isSearching = query.trim().length > 0;

    const renderItem = React.useCallback(({ item, index }: { item: SessionListViewItem, index: number }) => {
        switch (item.type) {
            case 'group': {
                const collapsed = isGroupCollapsed(item.key, item.kind);
                return (
                    <Pressable style={styles.groupHeader} onPress={() => toggleGroup(item.key, item.kind)}>
                        <Ionicons
                            name={collapsed ? 'chevron-forward' : 'chevron-down'}
                            size={12}
                            style={styles.groupHeaderText}
                        />
                        <Text style={styles.groupHeaderText} numberOfLines={1}>
                            {item.title}
                        </Text>
                        {item.subtitle ? (
                            <Text style={styles.groupHeaderSubtitle} numberOfLines={1}>
                                {item.subtitle}
                            </Text>
                        ) : null}
                        <Text style={styles.groupHeaderCount}>{item.count}</Text>
                    </Pressable>
                );
            }

            case 'session': {
                // Card styling based on position within the group
                const listData = visibleData!;
                const prevItem = index > 0 ? listData[index - 1] : null;
                const nextItem = index < listData.length - 1 ? listData[index + 1] : null;

                const isFirst = prevItem == null || prevItem.type === 'group';
                const isLast = nextItem == null || nextItem.type === 'group';
                const isSingle = isFirst && isLast;
                const selected = item.session.id === selectedSessionId;

                return (
                    <SessionItem
                        session={item.session}
                        selected={selected}
                        isFirst={isFirst}
                        isLast={isLast}
                        isSingle={isSingle}
                        showArchivedBadge={isSearching && item.session.archived}
                    />
                );
            }
        }
    }, [selectedSessionId, visibleData, isGroupCollapsed, toggleGroup, isSearching]);

    const HeaderComponent = React.useCallback(() => {
        return (
            <UpdateBanner />
        );
    }, []);

    const EmptyComponent = React.useCallback(() => {
        if (!isSearching) return null;
        return (
            <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>
                    {t('sidebar.searchNoResults', { query: query.trim() })}
                </Text>
            </View>
        );
    }, [isSearching, query]);

    // Early return if no data yet
    if (!visibleData) {
        return (
            <View style={styles.container} />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <SessionListControls
                    query={query}
                    onQueryChange={setQuery}
                    inputRef={searchInputRef}
                />
                <FlatList
                    data={visibleData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    extraData={selectedSessionId}
                    contentContainerStyle={{ paddingBottom: safeArea.bottom + 128, maxWidth: layout.maxWidth }}
                    ListHeaderComponent={HeaderComponent}
                    ListEmptyComponent={EmptyComponent}
                    windowSize={5}
                    maxToRenderPerBatch={8}
                    initialNumToRender={12}
                />
            </View>
        </View>
    );
}

const STATUS_CONFIG: Record<SessionState, { color: string; dotColor: string; isPulsing: boolean; isConnected: boolean }> = {
    disconnected: { color: '#999', dotColor: '#999', isPulsing: false, isConnected: false },
    thinking: { color: '#007AFF', dotColor: '#007AFF', isPulsing: true, isConnected: true },
    waiting: { color: '#34C759', dotColor: '#34C759', isPulsing: false, isConnected: true },
    permission_required: { color: '#FF9500', dotColor: '#FF9500', isPulsing: true, isConnected: true },
};

const SessionItem = React.memo(({ session, selected, isFirst, isLast, isSingle, showArchivedBadge }: {
    session: SessionRowData;
    selected?: boolean;
    isFirst?: boolean;
    isLast?: boolean;
    isSingle?: boolean;
    showArchivedBadge?: boolean;
}) => {
    const styles = stylesheet;
    const navigateToSession = useNavigateToSession();
    const [actionsAnchor, setActionsAnchor] = React.useState<SessionActionsAnchor | null>(null);
    const baseStatus = STATUS_CONFIG[session.state];
    // Override to solid blue when session has unread results
    const status = session.hasUnread
        ? { ...baseStatus, color: '#007AFF', dotColor: '#007AFF', isPulsing: false, isConnected: baseStatus.isConnected }
        : baseStatus;

    const vibingMessage = React.useMemo(() => {
        return vibingMessages[Math.floor(Math.random() * vibingMessages.length)].toLowerCase() + '…';
    }, [session.state]);

    const statusText = session.hasUnread
        ? t('status.unread')
        : session.state === 'thinking'
            ? vibingMessage
            : session.state === 'disconnected'
                ? t('status.lastSeen', { time: formatLastSeen(session.activeAt!, false) })
                : session.state === 'permission_required'
                    ? t('status.permissionRequired')
                    : t('status.online');

    const handlePress = React.useCallback(() => {
        navigateToSession(session.id);
    }, [navigateToSession, session.id]);

    const handleContextMenu = React.useCallback((event: any) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        setActionsAnchor({
            type: 'point',
            x: event.nativeEvent.clientX ?? event.nativeEvent.pageX ?? 0,
            y: event.nativeEvent.clientY ?? event.nativeEvent.pageY ?? 0,
        });
    }, []);

    const showActionAlert = useSessionActionAlert(session.id);
    const menuProps = Platform.OS === 'web' ? {
        onContextMenu: handleContextMenu,
    } as any : {
        onLongPress: showActionAlert,
    };

    return (
        <View style={[
            styles.sessionItemContainer,
            isSingle ? styles.sessionItemContainerSingle :
                isFirst ? styles.sessionItemContainerFirst :
                    isLast ? styles.sessionItemContainerLast : {}
        ]}>
        <Pressable
            style={[
                styles.sessionItem,
                selected && styles.sessionItemSelected,
                isSingle ? styles.sessionItemSingle :
                    isFirst ? styles.sessionItemFirst :
                        isLast ? styles.sessionItemLast : {}
            ]}
            onPress={handlePress}
            {...menuProps}
        >
            <View style={styles.avatarContainer}>
                <Avatar id={session.avatarId} size={48} monochrome={!status.isConnected} flavor={session.flavor} />
                {session.hasDraft && (
                    <View style={styles.draftIconContainer}>
                        <Ionicons
                            name="create-outline"
                            size={12}
                            style={styles.draftIconOverlay}
                        />
                    </View>
                )}
            </View>
            <View style={styles.sessionContent}>
                <View style={styles.sessionTitleRow}>
                    {session.pinned && (
                        <Ionicons name="pin" size={12} style={styles.pinIcon} />
                    )}
                    <Text style={[
                        styles.sessionTitle,
                        !session.isCustomName && styles.sessionTitleAI,
                        status.isConnected ? styles.sessionTitleConnected : styles.sessionTitleDisconnected
                    ]} numberOfLines={1}>
                        {session.name}
                    </Text>
                    {showArchivedBadge && (
                        <Text style={styles.archivedBadge}>{t('sidebar.archived')}</Text>
                    )}
                </View>

                {session.path ? (
                    <View style={styles.sessionSubtitleRow}>
                        <Text style={styles.sessionSubtitle} numberOfLines={1}>
                            {session.path.split(/[/\\]/).filter(Boolean).pop()}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.sessionSubtitle} numberOfLines={1}>
                        {session.subtitle}
                    </Text>
                )}

                <View style={styles.statusRow}>
                    <View style={styles.statusDotContainer}>
                        <StatusDot color={status.dotColor} isPulsing={status.isPulsing} />
                    </View>
                    <Text style={[
                        styles.statusText,
                        { color: status.color }
                    ]}>
                        {statusText}
                    </Text>
                </View>
            </View>
        </Pressable>
        {Platform.OS === 'web' && (
            <SessionActionsPopover
                anchor={actionsAnchor}
                onClose={() => setActionsAnchor(null)}
                sessionId={session.id}
                visible={!!actionsAnchor}
            />
        )}
        </View>
    );
});
